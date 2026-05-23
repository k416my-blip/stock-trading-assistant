/**
 * Single ownership for reconnect scheduling — budget, lock, resume gate, trace, coalescing.
 */
import { executeWebsocketReconnectJitter } from '../../services/websocketStabilityGuard';
import { resolveAsyncBudgetDecision } from '../../services/asyncBudgetSystem';
import { registerReconnectAttempt } from './reconnectStormGuard';
import { noteRuntimeReconnect, noteRuntimeSocketClosed } from './RuntimeReconnectTracker';
import { recordReconnectTrace } from './reconnectSequenceTrace';
import { isReconnectPausedForHydration } from './hydrationReconnectGate';
import { getMiuiDiagnostics } from './miuiBatteryDiagnostics';
import { STABILITY_RESUME_RACE_MS } from '../../constants/runtimeStability';
import { RESUME_RECONNECT_COALESCE_WINDOW_MS } from '../../constants/runtimeResumeCoordinator';
import { getResumeCoordinatorSnapshot } from '../coordinator/resumeCoordinatorIntegration';
import { isResumeGlobalGateActive, shouldCoalesceReconnect } from '../coordinator/RuntimeResumeCoordinator';
import type { ReconnectSource } from '../../types/reconnectEntry';
import {
  createReconnectUuid,
  noteCoordinatorReconnectScheduled,
} from '../../native/runtime/websocketOwnershipTrace';
import {
  recordCoordinatorReconnectTrace,
} from '../../native/runtime/nativeBoundaryTrace';
import { recordReconnectLatencyMs } from '../../native/runtime/nativeBoundaryHistograms';
import { noteObservabilityReconnect } from '../observability/runtimeObservabilityIntegration';

let reconnectTokenSeq = 0;
let lastResumeGateUntil = 0;
let lastScheduleAt = 0;
let lastScheduleSource: ReconnectSource | null = null;
let pendingScheduleToken: string | null = null;

export function resetReconnectCoordinatorForTest(): void {
  reconnectTokenSeq = 0;
  lastResumeGateUntil = 0;
  lastScheduleAt = 0;
  lastScheduleSource = null;
  pendingScheduleToken = null;
}

export function noteResumeStormGate(at = Date.now()): void {
  const diag = getMiuiDiagnostics();
  if (diag.resumeLatencyMs >= STABILITY_RESUME_RACE_MS) {
    applyResumeGlobalGate(Math.min(15_000, diag.resumeLatencyMs), at);
  }
}

/** Effect executor — extends resume storm gate from coordinator plan. */
export function applyResumeGlobalGate(gateMs: number, at = Date.now()): void {
  lastResumeGateUntil = Math.max(lastResumeGateUntil, at + gateMs);
  recordReconnectTrace({
    phase: 'defer',
    delayMs: gateMs,
    allowed: false,
    storm: false,
    detailJa: 'resume coordinator global gate',
    source: 'resume_coordinator',
  });
}

export function isResumeReconnectGated(now = Date.now()): boolean {
  const snap = getResumeCoordinatorSnapshot();
  if (snap && isResumeGlobalGateActive(snap, now)) return true;
  return now < lastResumeGateUntil || isReconnectPausedForHydration();
}

export function createReconnectSocketKey(prefix = 'ws'): string {
  reconnectTokenSeq += 1;
  return `${prefix}-${reconnectTokenSeq}`;
}

export type ReconnectScheduleResult = {
  scheduled: boolean;
  token: string;
  reasonJa: string;
  coalesced?: boolean;
  source: ReconnectSource;
};

function shouldCoalesceDuplicate(source: ReconnectSource, now: number): boolean {
  if (pendingScheduleToken && now - lastScheduleAt < RESUME_RECONNECT_COALESCE_WINDOW_MS) {
    return true;
  }
  if (
    lastScheduleSource === source &&
    now - lastScheduleAt < RESUME_RECONNECT_COALESCE_WINDOW_MS
  ) {
    return true;
  }
  const snap = getResumeCoordinatorSnapshot();
  if (snap && shouldCoalesceReconnect(snap) && now - lastScheduleAt < RESUME_RECONNECT_COALESCE_WINDOW_MS) {
    return true;
  }
  return false;
}

/** Sole public reconnect scheduling entry. */
export function requestReconnectSchedule(
  baseMs: number,
  maxMs: number,
  reasonJa: string,
  source: ReconnectSource = 'kernel_policy',
): ReconnectScheduleResult {
  const now = Date.now();
  const reconnectUuid = createReconnectUuid(source);
  const token = createReconnectSocketKey(source.slice(0, 4));

  recordReconnectTrace({
    phase: 'request',
    delayMs: baseMs,
    allowed: true,
    storm: false,
    detailJa: reasonJa,
    source,
    token,
  });

  if (shouldCoalesceDuplicate(source, now)) {
    recordReconnectTrace({
      phase: 'coalesce',
      delayMs: 0,
      allowed: false,
      storm: false,
      detailJa: `${reasonJa} · duplicate suppressed`,
      source,
      token: pendingScheduleToken ?? token,
    });
    return {
      scheduled: false,
      token: pendingScheduleToken ?? token,
      reasonJa: `${reasonJa} · coalesced`,
      coalesced: true,
      source,
    };
  }

  if (isResumeReconnectGated(now)) {
    recordReconnectTrace({
      phase: 'defer',
      delayMs: baseMs,
      allowed: false,
      storm: false,
      detailJa: `${reasonJa} · resume gate`,
      source,
      token,
    });
    return { scheduled: false, token, reasonJa: `${reasonJa} · gated`, source };
  }

  if (isReconnectPausedForHydration()) {
    recordReconnectTrace({
      phase: 'defer',
      delayMs: baseMs,
      allowed: false,
      storm: false,
      detailJa: `${reasonJa} · hydration pause`,
      source,
      token,
    });
    return { scheduled: false, token, reasonJa: `${reasonJa} · hydration pause`, source };
  }

  const asyncDecision = resolveAsyncBudgetDecision('websocket');
  if (asyncDecision === 'idle_schedule' || asyncDecision === 'defer') {
    recordReconnectTrace({
      phase: 'defer',
      delayMs: baseMs,
      allowed: false,
      storm: false,
      detailJa: `${reasonJa} · async budget ${asyncDecision}`,
      source,
      token,
    });
    return { scheduled: false, token, reasonJa: `${reasonJa} · async budget`, source };
  }

  const attempt = registerReconnectAttempt(now);
  if (!attempt.allowed) {
    recordReconnectTrace({
      phase: 'budget_block',
      delayMs: attempt.delayMs,
      allowed: false,
      storm: attempt.storm,
      detailJa: reasonJa,
      source,
      token,
    });
    if (attempt.storm) {
      noteObservabilityReconnect(`${reasonJa} · storm blocked`, true);
    }
    return { scheduled: false, token, reasonJa: `${reasonJa} · budget`, source };
  }

  noteRuntimeReconnect(token);
  pendingScheduleToken = token;
  lastScheduleAt = now;
  lastScheduleSource = source;
  noteCoordinatorReconnectScheduled(reconnectUuid, source);
  recordCoordinatorReconnectTrace(source, reconnectUuid, reasonJa);
  recordReconnectLatencyMs(baseMs);

  recordReconnectTrace({
    phase: 'schedule',
    delayMs: baseMs,
    allowed: true,
    storm: false,
    detailJa: reasonJa,
    source,
    token: reconnectUuid,
  });
  noteObservabilityReconnect(reasonJa, attempt.storm);

  executeWebsocketReconnectJitter(baseMs, maxMs, { token: reconnectUuid, source });
  return { scheduled: true, token, reasonJa, source };
}

export function noteReconnectSocketClosed(socketKey: string): void {
  noteRuntimeSocketClosed(socketKey);
  pendingScheduleToken = null;
}

export function getReconnectCoordinatorStateForTest(): {
  lastScheduleAt: number;
  lastScheduleSource: ReconnectSource | null;
  pendingScheduleToken: string | null;
} {
  return { lastScheduleAt, lastScheduleSource, pendingScheduleToken };
}
