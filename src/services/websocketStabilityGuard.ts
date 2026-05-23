import { scheduleDedupedTimer } from './mobileRedmiRuntime';
import { noteWebsocketReconnect } from './mobileRuntimeMetrics';
import {
  noteWebsocketHeartbeatDelay,
  noteWebsocketReconnectAttempt,
  noteWebsocketRtt,
} from './websocketTelemetry';
import { TELEMETRY_HEARTBEAT_BASE_MS } from '../constants/runtimeTelemetry';
import {
  computeReconnectBackoffMs,
  resetReconnectBackoffOnStable,
} from '../runtime/stability/reconnectStormGuard';
import { recordReconnectTrace } from '../runtime/stability/reconnectSequenceTrace';
import type { ReconnectSource } from '../types/reconnectEntry';
import {
  noteJsReconnectExecuted,
} from '../native/runtime/websocketOwnershipTrace';
import {
  recordJsReconnectExecuteTrace,
} from '../native/runtime/nativeBoundaryTrace';
import { recordReconnectLatencyMs } from '../native/runtime/nativeBoundaryHistograms';

let lightweightMode = false;
let offlineDebounceUntil = 0;
let lastHeartbeatAt = 0;
let frameBatch: (() => void)[] = [];
let frameBatchTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectJitterMs = 0;
let heartbeatIntervalMs = TELEMETRY_HEARTBEAT_BASE_MS;

export function resetWebsocketStabilityGuardForTest(): void {
  lightweightMode = false;
  offlineDebounceUntil = 0;
  lastHeartbeatAt = 0;
  frameBatch = [];
  if (frameBatchTimer) clearTimeout(frameBatchTimer);
  frameBatchTimer = null;
  reconnectJitterMs = 0;
  heartbeatIntervalMs = TELEMETRY_HEARTBEAT_BASE_MS;
}

export function setWebsocketHeartbeatIntervalMs(ms: number): void {
  heartbeatIntervalMs = Math.max(5000, Math.min(60_000, Math.round(ms)));
}

export function getWebsocketHeartbeatIntervalMs(): number {
  return heartbeatIntervalMs;
}

export function setWebsocketLightweightMode(enabled: boolean): void {
  lightweightMode = enabled;
}

export function noteOfflineForDebounce(durationMs = 5000): void {
  offlineDebounceUntil = Date.now() + durationMs;
}

export function isOfflineDebounced(): boolean {
  return Date.now() < offlineDebounceUntil;
}

/** Internal — only reconnectCoordinator may invoke after budget/gate checks. */
export function executeWebsocketReconnectJitter(
  baseMs: number,
  maxMs: number,
  meta?: { token: string; source: ReconnectSource },
): void {
  const backoff = computeReconnectBackoffMs();
  reconnectJitterMs = Math.min(maxMs, backoff + Math.floor(Math.random() * baseMs * 0.4));
  scheduleDedupedTimer('ws-reconnect-jitter', () => {
    if (!isOfflineDebounced()) {
      const uuid = meta?.token ?? 'unknown';
      recordReconnectTrace({
        phase: 'execute',
        delayMs: reconnectJitterMs,
        allowed: true,
        storm: false,
        detailJa: 'reconnect execute',
        source: meta?.source,
        token: uuid,
      });
      recordJsReconnectExecuteTrace(uuid, reconnectJitterMs);
      recordReconnectLatencyMs(reconnectJitterMs);
      noteJsReconnectExecuted(uuid, reconnectJitterMs);
      noteWebsocketReconnect();
      noteWebsocketReconnectAttempt();
      noteWebsocketRtt(reconnectJitterMs);
      void import('../native/runtime/miuiReclaimDetector').then(({ noteMiuiForcedReconnect }) => {
        noteMiuiForcedReconnect();
      });
      void import('../native/runtime/lifecycleTimeline').then(({ recordLifecycleEvent }) => {
        recordLifecycleEvent(
          'reconnect_end',
          `${meta?.source ?? 'ws'} · jitter ${reconnectJitterMs}ms`,
          false,
        );
      });
    }
  }, reconnectJitterMs);
}

export function noteWebsocketStableConnection(): void {
  resetReconnectBackoffOnStable();
  recordReconnectTrace({
    phase: 'stable',
    delayMs: 0,
    allowed: true,
    storm: false,
    detailJa: 'connection stable',
  });
}

export function batchWebsocketFrame(fn: () => void): void {
  if (lightweightMode) {
    frameBatch.push(fn);
    if (frameBatchTimer) return;
    frameBatchTimer = setTimeout(() => {
      frameBatchTimer = null;
      const batch = frameBatch.splice(0, frameBatch.length);
      for (const f of batch.slice(0, 3)) f();
    }, lightweightMode ? 120 : 48);
    return;
  }
  fn();
}

export function scheduleHeartbeatBackoff(intervalMs?: number): void {
  const effective = intervalMs ?? heartbeatIntervalMs;
  const now = Date.now();
  const elapsed = now - lastHeartbeatAt;
  if (lastHeartbeatAt > 0) {
    noteWebsocketHeartbeatDelay(elapsed);
    noteWebsocketRtt(elapsed);
    void import('../runtime/stability/reconnectSequenceTrace').then(({ noteHeartbeatDrift }) => {
      noteHeartbeatDrift(elapsed);
    });
  }
  if (elapsed < effective) return;
  lastHeartbeatAt = now;
}

export function getWebsocketFrameDelayMs(): number {
  return reconnectJitterMs;
}
