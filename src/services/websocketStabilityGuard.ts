import { scheduleDedupedTimer } from './mobileRedmiRuntime';
import { resolveAsyncBudgetDecision } from './asyncBudgetSystem';
import { noteWebsocketReconnect } from './mobileRuntimeMetrics';
import {
  noteWebsocketHeartbeatDelay,
  noteWebsocketReconnectAttempt,
  noteWebsocketRtt,
} from './websocketTelemetry';
import { TELEMETRY_HEARTBEAT_BASE_MS } from '../constants/runtimeTelemetry';
import {
  computeReconnectBackoffMs,
  registerReconnectAttempt,
  resetReconnectBackoffOnStable,
  getReconnectBudgetRemaining,
  getReconnectCooldownUntil,
} from '../runtime/stability/reconnectStormGuard';
import { noteRuntimeReconnect } from '../runtime/stability/RuntimeReconnectTracker';
import { recordReconnectTrace } from '../runtime/stability/reconnectSequenceTrace';

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

export function executeWebsocketReconnectJitter(baseMs: number, maxMs: number): void {
  const backoff = computeReconnectBackoffMs();
  reconnectJitterMs = Math.min(maxMs, backoff + Math.floor(Math.random() * baseMs * 0.4));
  recordReconnectTrace({
    phase: 'schedule',
    delayMs: reconnectJitterMs,
    allowed: true,
    storm: false,
    detailJa: 'jitter scheduled',
  });
  scheduleDedupedTimer('ws-reconnect-jitter', () => {
    if (!isOfflineDebounced()) {
      recordReconnectTrace({
        phase: 'execute',
        delayMs: reconnectJitterMs,
        allowed: true,
        storm: false,
        detailJa: 'reconnect execute',
      });
      noteRuntimeReconnect('ws-jitter');
      noteWebsocketReconnect();
      noteWebsocketReconnectAttempt();
      noteWebsocketRtt(reconnectJitterMs);
      void import('../native/runtime/miuiReclaimDetector').then(({ noteMiuiForcedReconnect }) => {
        noteMiuiForcedReconnect();
      });
      void import('../native/runtime/lifecycleTimeline').then(({ recordLifecycleEvent }) => {
        recordLifecycleEvent('reconnect_end', `jitter ${reconnectJitterMs}ms`, false);
      });
    }
  }, reconnectJitterMs);
}

export function scheduleWebsocketReconnectWithJitter(baseMs: number, maxMs: number): void {
  const decision = resolveAsyncBudgetDecision('websocket');
  if (decision === 'idle_schedule' || decision === 'defer') {
    recordReconnectTrace({
      phase: 'defer',
      delayMs: baseMs * 2,
      allowed: false,
      storm: false,
      detailJa: `async budget ${decision}`,
    });
    scheduleDedupedTimer('ws-reconnect-deferred', () => {}, baseMs * 2);
    return;
  }

  const attempt = registerReconnectAttempt();
  if (!attempt.allowed) {
    recordReconnectTrace({
      phase: 'budget_block',
      delayMs: attempt.delayMs,
      allowed: false,
      storm: attempt.storm,
      detailJa: `budget ${getReconnectBudgetRemaining()} cooldown ${getReconnectCooldownUntil()}`,
    });
    scheduleDedupedTimer('ws-reconnect-budget-blocked', () => {}, attempt.delayMs);
    return;
  }

  executeWebsocketReconnectJitter(baseMs, maxMs);
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
