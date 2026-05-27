import {
  noteLongSessionOfflineOnlineReplay,
  noteLongSessionReconnectReplay,
  noteLongSessionRetryReplay,
  noteLongSessionStaleAsyncReplay,
} from './longSessionRuntimeSoak';
import {
  noteProductionAsyncQueueDelay,
  noteProductionOfflineRecoveryLatency,
  noteProductionReconnectLatency,
} from './productionRuntimeProfiler';

export type RuntimeChaosEventKind =
  | 'async_started'
  | 'async_completed'
  | 'async_failed'
  | 'async_duplicate'
  | 'async_stale_rejected'
  | 'offline_transition'
  | 'offline_queue_rejected'
  | 'reconnect_allowed'
  | 'reconnect_debounced'
  | 'reconnect_cooldown'
  | 'retry_attempt'
  | 'retry_cascade'
  | 'hydration_collision'
  | 'hydration_suppressed';

export type RuntimeChaosEvent = {
  at: string;
  kind: RuntimeChaosEventKind;
  scope: string;
  detail?: string;
  value?: number;
};

export type RuntimeChaosResilienceReport = {
  reconnectStabilityReport: RuntimeChaosEvent[];
  asyncCollisionReport: {
    pendingScopes: number;
    duplicateAsyncCount: number;
    staleAsyncRejectedCount: number;
  };
  retryStormReport: {
    retryAttempts: number;
    retryCascadeCount: number;
    retryScopes: string[];
  };
  offlineRecoveryReport: {
    offlineTransitions: number;
    offlineQueueRejected: number;
    lastOfflineAt: string | null;
    lastOnlineAt: string | null;
  };
  hydrationCollisionReport: {
    hydrationCollisions: number;
    hydrationSuppressed: number;
  };
  metrics: {
    reconnectStabilityScore: number;
    asyncSafetyScore: number;
    retryCascadeContainmentScore: number;
    offlineRecoverySafetyScore: number;
    staleAsyncPreventionScore: number;
    chaosResilienceScore: number;
  };
};

const MAX_EVENTS = 180;
const RECONNECT_DEBOUNCE_MS = 2_000;
const RECONNECT_COOLDOWN_MS = 8_000;
const RETRY_WINDOW_MS = 60_000;
const RETRY_CASCADE_THRESHOLD = 6;

const events: RuntimeChaosEvent[] = [];
const pendingAsync = new Map<string, number>();
const retryTimestamps = new Map<string, number[]>();
const reconnectLastAt = new Map<string, number>();
const reconnectCooldownUntil = new Map<string, number>();

let duplicateAsyncCount = 0;
let staleAsyncRejectedCount = 0;
let retryAttempts = 0;
let retryCascadeCount = 0;
let offlineTransitions = 0;
let offlineQueueRejected = 0;
let hydrationCollisions = 0;
let hydrationSuppressed = 0;
let lastOfflineAt: string | null = null;
let lastOnlineAt: string | null = null;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function record(kind: RuntimeChaosEventKind, scope: string, detail?: string, value?: number): void {
  events.push({ at: new Date().toISOString(), kind, scope, detail, value });
  if (events.length > MAX_EVENTS) events.shift();
}

export function noteChaosAsyncStart(scope: string): number {
  const next = (pendingAsync.get(scope) ?? 0) + 1;
  if (next > 1) {
    duplicateAsyncCount += 1;
    record('async_duplicate', scope, 'overlapping async lifecycle', next);
    noteProductionAsyncQueueDelay(scope, next, 'overlapping async lifecycle');
  }
  pendingAsync.set(scope, next);
  record('async_started', scope, undefined, next);
  return next;
}

export function noteChaosAsyncComplete(scope: string, ok: boolean): void {
  const next = Math.max(0, (pendingAsync.get(scope) ?? 1) - 1);
  if (next === 0) pendingAsync.delete(scope);
  else pendingAsync.set(scope, next);
  record(ok ? 'async_completed' : 'async_failed', scope, undefined, next);
}

export function noteStaleAsyncRejected(scope: string, detail?: string): void {
  staleAsyncRejectedCount += 1;
  record('async_stale_rejected', scope, detail);
  noteLongSessionStaleAsyncReplay(scope, detail);
}

export function noteOfflineTransition(offline: boolean, scope = 'network'): void {
  offlineTransitions += 1;
  if (offline) lastOfflineAt = new Date().toISOString();
  else lastOnlineAt = new Date().toISOString();
  record('offline_transition', scope, offline ? 'offline' : 'online');
  noteLongSessionOfflineOnlineReplay(offline, scope);
  noteProductionOfflineRecoveryLatency(scope, 0, offline ? 'offline' : 'online');
}

export function noteOfflineQueueRejected(scope: string, detail?: string): void {
  offlineQueueRejected += 1;
  record('offline_queue_rejected', scope, detail);
}

export function shouldAllowReconnect(scope: string, nowMs = Date.now()): boolean {
  const last = reconnectLastAt.get(scope) ?? 0;
  const cooldownUntil = reconnectCooldownUntil.get(scope) ?? 0;
  if (nowMs - last < RECONNECT_DEBOUNCE_MS) {
    record('reconnect_debounced', scope, undefined, nowMs - last);
    noteLongSessionReconnectReplay(scope, `debounced:${nowMs - last}`);
    noteProductionReconnectLatency(scope, nowMs - last, 'debounced');
    return false;
  }
  if (nowMs < cooldownUntil) {
    record('reconnect_cooldown', scope, undefined, cooldownUntil - nowMs);
    noteLongSessionReconnectReplay(scope, `cooldown:${cooldownUntil - nowMs}`);
    noteProductionReconnectLatency(scope, cooldownUntil - nowMs, 'cooldown');
    return false;
  }
  reconnectLastAt.set(scope, nowMs);
  reconnectCooldownUntil.set(scope, nowMs + RECONNECT_COOLDOWN_MS);
  record('reconnect_allowed', scope);
  noteLongSessionReconnectReplay(scope, 'allowed');
  noteProductionReconnectLatency(scope, nowMs - last, 'allowed');
  return true;
}

export function noteRetryAttempt(scope: string, detail?: string, nowMs = Date.now()): void {
  retryAttempts += 1;
  const recent = (retryTimestamps.get(scope) ?? []).filter((at) => nowMs - at < RETRY_WINDOW_MS);
  recent.push(nowMs);
  retryTimestamps.set(scope, recent);
  record('retry_attempt', scope, detail, recent.length);
  noteLongSessionRetryReplay(scope, recent.length, detail);
  noteProductionAsyncQueueDelay(scope, recent.length, detail);
  if (recent.length === RETRY_CASCADE_THRESHOLD) {
    retryCascadeCount += 1;
    record('retry_cascade', scope, detail, recent.length);
  }
}

export function noteHydrationCollision(scope: string, detail?: string): void {
  hydrationCollisions += 1;
  record('hydration_collision', scope, detail);
}

export function noteHydrationSuppressed(scope: string, detail?: string): void {
  hydrationSuppressed += 1;
  record('hydration_suppressed', scope, detail);
}

export function getRuntimeChaosResilienceReport(): RuntimeChaosResilienceReport {
  const reconnectIssues = events.filter(
    (event) => event.kind === 'reconnect_debounced' || event.kind === 'reconnect_cooldown',
  ).length;
  const reconnectAllowed = events.filter((event) => event.kind === 'reconnect_allowed').length;
  const reconnectStabilityScore = round(
    1 - Math.min(0.9, reconnectIssues / Math.max(1, reconnectAllowed + reconnectIssues)),
  );
  const asyncSafetyScore = round(
    1 - Math.min(0.9, (duplicateAsyncCount + pendingAsync.size) / Math.max(1, duplicateAsyncCount + staleAsyncRejectedCount + 8)),
  );
  const retryCascadeContainmentScore = round(1 - Math.min(0.9, retryCascadeCount / Math.max(1, retryAttempts)));
  const offlineRecoverySafetyScore = round(
    1 - Math.min(0.9, offlineQueueRejected / Math.max(1, offlineTransitions + offlineQueueRejected)),
  );
  const staleAsyncPreventionScore = round(
    staleAsyncRejectedCount > 0 ? 1 : 1 - Math.min(0.5, duplicateAsyncCount / 20),
  );
  const chaosResilienceScore = round(
    (reconnectStabilityScore +
      asyncSafetyScore +
      retryCascadeContainmentScore +
      offlineRecoverySafetyScore +
      staleAsyncPreventionScore) /
      5,
  );

  return {
    reconnectStabilityReport: [...events],
    asyncCollisionReport: {
      pendingScopes: pendingAsync.size,
      duplicateAsyncCount,
      staleAsyncRejectedCount,
    },
    retryStormReport: {
      retryAttempts,
      retryCascadeCount,
      retryScopes: [...retryTimestamps.keys()],
    },
    offlineRecoveryReport: {
      offlineTransitions,
      offlineQueueRejected,
      lastOfflineAt,
      lastOnlineAt,
    },
    hydrationCollisionReport: {
      hydrationCollisions,
      hydrationSuppressed,
    },
    metrics: {
      reconnectStabilityScore,
      asyncSafetyScore,
      retryCascadeContainmentScore,
      offlineRecoverySafetyScore,
      staleAsyncPreventionScore,
      chaosResilienceScore,
    },
  };
}

export function resetRuntimeChaosResilienceForTest(): void {
  events.length = 0;
  pendingAsync.clear();
  retryTimestamps.clear();
  reconnectLastAt.clear();
  reconnectCooldownUntil.clear();
  duplicateAsyncCount = 0;
  staleAsyncRejectedCount = 0;
  retryAttempts = 0;
  retryCascadeCount = 0;
  offlineTransitions = 0;
  offlineQueueRejected = 0;
  hydrationCollisions = 0;
  hydrationSuppressed = 0;
  lastOfflineAt = null;
  lastOnlineAt = null;
}
