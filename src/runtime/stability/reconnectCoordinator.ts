/**
 * Single ownership for reconnect scheduling — budget, lock, resume gate, trace.
 */
import { executeWebsocketReconnectJitter } from '../../services/websocketStabilityGuard';
import { registerReconnectAttempt, canScheduleReconnect } from './reconnectStormGuard';
import { noteRuntimeReconnect, noteRuntimeSocketClosed } from './RuntimeReconnectTracker';
import { recordReconnectTrace } from './reconnectSequenceTrace';
import { isReconnectPausedForHydration } from './hydrationReconnectGate';
import { getMiuiDiagnostics } from './miuiBatteryDiagnostics';
import { STABILITY_RESUME_RACE_MS } from '../../constants/runtimeStability';

let reconnectTokenSeq = 0;
let lastResumeGateUntil = 0;

export function resetReconnectCoordinatorForTest(): void {
  reconnectTokenSeq = 0;
  lastResumeGateUntil = 0;
}

export function noteResumeStormGate(at = Date.now()): void {
  const diag = getMiuiDiagnostics();
  if (diag.resumeLatencyMs >= STABILITY_RESUME_RACE_MS) {
    lastResumeGateUntil = at + Math.min(15_000, diag.resumeLatencyMs);
    recordReconnectTrace({
      phase: 'defer',
      delayMs: diag.resumeLatencyMs,
      allowed: false,
      storm: false,
      detailJa: 'resume storm gate',
    });
  }
}

export function isResumeReconnectGated(now = Date.now()): boolean {
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
};

export function requestReconnectSchedule(
  baseMs: number,
  maxMs: number,
  reasonJa: string,
): ReconnectScheduleResult {
  const token = createReconnectSocketKey('coord');
  if (isResumeReconnectGated()) {
    return { scheduled: false, token, reasonJa: `${reasonJa} · gated` };
  }
  if (isReconnectPausedForHydration()) {
    recordReconnectTrace({
      phase: 'defer',
      delayMs: baseMs,
      allowed: false,
      storm: false,
      detailJa: `${reasonJa} · hydration pause`,
    });
    return { scheduled: false, token, reasonJa: `${reasonJa} · hydration pause` };
  }
  if (!canScheduleReconnect()) {
    const attempt = registerReconnectAttempt();
    recordReconnectTrace({
      phase: 'budget_block',
      delayMs: attempt.delayMs,
      allowed: false,
      storm: attempt.storm,
      detailJa: reasonJa,
    });
    return { scheduled: false, token, reasonJa: `${reasonJa} · budget` };
  }
  noteRuntimeReconnect(token);
  executeWebsocketReconnectJitter(baseMs, maxMs);
  return { scheduled: true, token, reasonJa };
}

export function noteReconnectSocketClosed(socketKey: string): void {
  noteRuntimeSocketClosed(socketKey);
}
