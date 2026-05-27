import type { AppStateStatus } from 'react-native';
import { getPerformanceCostSnapshot } from './performanceCostRuntime';
import { noteProductionMemoryProfile } from './productionRuntimeProfiler';

export type RuntimeMemoryPriority = 'interaction' | 'normal' | 'proactive' | 'analytics' | 'archive';

export type RuntimeMemoryDefenseEventKind =
  | 'memory_growth_sample'
  | 'timer_retained'
  | 'timer_released'
  | 'listener_retained'
  | 'listener_released'
  | 'deferred_queued'
  | 'deferred_completed'
  | 'deferred_cancelled'
  | 'inactive_hydration_retained'
  | 'stale_closure_estimated'
  | 'cleanup_activity'
  | 'low_priority_queue_evicted'
  | 'background_memory_cleanup';

export type RuntimeMemoryDefenseEvent = {
  at: string;
  kind: RuntimeMemoryDefenseEventKind;
  label: string;
  value?: number;
  detail?: string;
};

export type RuntimeMemoryCleanupDecision = {
  allow: boolean;
  cleanup: boolean;
  delayMs: number;
  reason: string;
};

export type RuntimeMemoryPressureDefenseReport = {
  memoryPressureReport: RuntimeMemoryDefenseEvent[];
  listenerLifecycleDiagnostics: {
    activeListeners: number;
    maxActiveListeners: number;
    listenerLeakCandidates: string[];
  };
  timerRetentionDiagnostics: {
    activeTimers: number;
    maxActiveTimers: number;
    timerRetentionCandidates: string[];
  };
  deferredQueueDiagnostics: {
    activeDeferred: number;
    maxActiveDeferred: number;
    deferredQueueRetainedMs: number;
    queueEvictions: number;
  };
  inactiveHydrationDiagnostics: {
    inactiveRetentionCount: number;
    backgroundCleanupCount: number;
    staleClosureEstimateCount: number;
  };
  cleanupActivityReport: RuntimeMemoryDefenseEvent[];
  metrics: {
    runtimeMemorySafetyScore: number;
    listenerLeakPreventionScore: number;
    timerRetentionSafetyScore: number;
    deferredQueueContainmentScore: number;
    inactiveHydrationCleanupScore: number;
    mobileMemoryResilienceScore: number;
  };
};

const MAX_EVENTS = 220;
const TIMER_RETAINED_MS = 60_000;
const LISTENER_WARNING_COUNT = 8;
const TIMER_WARNING_COUNT = 18;
const DEFERRED_QUEUE_CAP = 8;
const BACKGROUND_RETRY_MS = 30_000;

const events: RuntimeMemoryDefenseEvent[] = [];
const activeTimers = new Map<string, { label: string; at: number }>();
const activeListeners = new Map<string, number>();
const activeDeferred = new Map<string, { priority: RuntimeMemoryPriority; at: number; attempts: number }>();

let maxActiveTimers = 0;
let maxActiveListeners = 0;
let maxActiveDeferred = 0;
let inactiveRetentionCount = 0;
let staleClosureEstimateCount = 0;
let backgroundCleanupCount = 0;
let queueEvictions = 0;
let lastBackgroundAt: number | null = null;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function record(kind: RuntimeMemoryDefenseEventKind, label: string, value?: number, detail?: string): void {
  events.push({ at: new Date().toISOString(), kind, label, value, detail });
  if (events.length > MAX_EVENTS) events.shift();
}

function estimateMemoryGrowth(): number {
  return round(activeTimers.size * 0.15 + activeListeners.size * 0.35 + activeDeferred.size * 0.45);
}

function recordMemoryProfile(label: string, detail?: string): void {
  noteProductionMemoryProfile(label, estimateMemoryGrowth(), detail);
}

export function noteMemoryTimerScheduled(label: string, id: string): void {
  activeTimers.set(id, { label, at: Date.now() });
  maxActiveTimers = Math.max(maxActiveTimers, activeTimers.size);
  record('timer_retained', label, activeTimers.size);
  record('memory_growth_sample', 'timer-retention', estimateMemoryGrowth(), label);
  recordMemoryProfile('timer-retention', label);
}

export function noteMemoryTimerCleared(id: string, label = 'timer'): void {
  if (activeTimers.delete(id)) {
    record('timer_released', label, activeTimers.size);
  }
}

export function noteMemoryListenerRegistered(label: string): void {
  activeListeners.set(label, (activeListeners.get(label) ?? 0) + 1);
  maxActiveListeners = Math.max(maxActiveListeners, activeListeners.size);
  record('listener_retained', label, activeListeners.size);
  record('memory_growth_sample', 'listener-retention', estimateMemoryGrowth(), label);
  recordMemoryProfile('listener-retention', label);
}

export function noteMemoryListenerRemoved(label: string): void {
  const next = Math.max(0, (activeListeners.get(label) ?? 1) - 1);
  if (next === 0) activeListeners.delete(label);
  else activeListeners.set(label, next);
  record('listener_released', label, activeListeners.size);
}

export function noteMemoryDeferredQueued(label: string, priority: RuntimeMemoryPriority): void {
  const previous = activeDeferred.get(label);
  activeDeferred.set(label, {
    priority,
    at: previous?.at ?? Date.now(),
    attempts: (previous?.attempts ?? 0) + 1,
  });
  maxActiveDeferred = Math.max(maxActiveDeferred, activeDeferred.size);
  record('deferred_queued', label, activeDeferred.size, priority);
  record('memory_growth_sample', 'deferred-retention', estimateMemoryGrowth(), label);
  recordMemoryProfile('deferred-retention', label);
}

export function noteMemoryDeferredCompleted(label: string): void {
  activeDeferred.delete(label);
  record('deferred_completed', label, activeDeferred.size);
}

export function noteMemoryDeferredCancelled(label: string, detail?: string): void {
  activeDeferred.delete(label);
  record('deferred_cancelled', label, activeDeferred.size, detail);
}

export function noteInactiveHydrationRetention(label: string, appState: AppStateStatus): void {
  inactiveRetentionCount += 1;
  record('inactive_hydration_retained', label, inactiveRetentionCount, appState);
  recordMemoryProfile('inactive-hydration-retention', `${label}:${appState}`);
}

export function noteStaleClosureRetentionEstimate(label: string, detail?: string): void {
  staleClosureEstimateCount += 1;
  record('stale_closure_estimated', label, staleClosureEstimateCount, detail);
  recordMemoryProfile('stale-closure-retention', detail ?? label);
}

export function noteMemoryCleanupActivity(label: string, detail?: string): void {
  record('cleanup_activity', label, undefined, detail);
  recordMemoryProfile('cleanup-activity', detail ?? label);
}

export function noteMemoryAppStateTransition(nextState: AppStateStatus): void {
  if (nextState === 'active') {
    if (lastBackgroundAt != null && Date.now() - lastBackgroundAt > 5 * 60_000) {
      backgroundCleanupCount += 1;
      record('background_memory_cleanup', 'AppState', backgroundCleanupCount, 'long background retention');
      recordMemoryProfile('background-memory-cleanup', 'long background retention');
    }
    lastBackgroundAt = null;
    return;
  }
  lastBackgroundAt = Date.now();
  backgroundCleanupCount += 1;
  record('background_memory_cleanup', 'AppState', backgroundCleanupCount, nextState);
  recordMemoryProfile('background-memory-cleanup', nextState);
}

export function decideMemoryHydrationCleanup(
  label: string,
  priority: RuntimeMemoryPriority,
  appState: AppStateStatus,
): RuntimeMemoryCleanupDecision {
  const performance = getPerformanceCostSnapshot();
  const lowPriority = priority === 'archive' || priority === 'analytics' || priority === 'proactive';
  const retained = activeDeferred.get(label);
  const retainedMs = retained ? Date.now() - retained.at : 0;
  const timerPressure = activeTimers.size >= TIMER_WARNING_COUNT;
  const listenerPressure = activeListeners.size >= LISTENER_WARNING_COUNT;
  const queuePressure = activeDeferred.size >= DEFERRED_QUEUE_CAP;
  const backgroundPressure = appState !== 'active' || !performance.appForeground;
  const memoryMode = performance.batterySaverActive || performance.offlineMode;

  if (lowPriority && (queuePressure || timerPressure || listenerPressure || memoryMode)) {
    queueEvictions += 1;
    activeDeferred.delete(label);
    record(
      'low_priority_queue_evicted',
      label,
      queueEvictions,
      `priority=${priority};queue=${activeDeferred.size};timer=${activeTimers.size};listener=${activeListeners.size}`,
    );
    return {
      allow: false,
      cleanup: true,
      delayMs: memoryMode ? 12_000 : 4_000,
      reason: `low priority memory cleanup;priority=${priority}`,
    };
  }

  if (backgroundPressure && lowPriority) {
    inactiveRetentionCount += 1;
    activeDeferred.delete(label);
    record('inactive_hydration_retained', label, inactiveRetentionCount, appState);
    return {
      allow: false,
      cleanup: true,
      delayMs: BACKGROUND_RETRY_MS,
      reason: `background suspended hydration;state=${appState}`,
    };
  }

  if (retainedMs > TIMER_RETAINED_MS && lowPriority) {
    queueEvictions += 1;
    activeDeferred.delete(label);
    record('low_priority_queue_evicted', label, queueEvictions, `retainedMs=${retainedMs}`);
    return {
      allow: false,
      cleanup: true,
      delayMs: 8_000,
      reason: `inactive queue expiration;retainedMs=${retainedMs}`,
    };
  }

  return { allow: true, cleanup: false, delayMs: 0, reason: 'memory pressure acceptable' };
}

export function getRuntimeMemoryPressureDefenseReport(): RuntimeMemoryPressureDefenseReport {
  const now = Date.now();
  const timerRetentionCandidates = [...activeTimers.values()]
    .filter((timer) => now - timer.at >= TIMER_RETAINED_MS)
    .map((timer) => timer.label);
  const listenerLeakCandidates = [...activeListeners.entries()]
    .filter(([, count]) => count > 1 || activeListeners.size >= LISTENER_WARNING_COUNT)
    .map(([label]) => label);
  const deferredQueueRetainedMs = [...activeDeferred.values()].reduce(
    (max, item) => Math.max(max, now - item.at),
    0,
  );
  const runtimeMemorySafetyScore = round(
    1 - Math.min(0.9, (activeTimers.size + activeListeners.size + activeDeferred.size) / 80),
  );
  const listenerLeakPreventionScore = round(1 - Math.min(0.9, listenerLeakCandidates.length / 12));
  const timerRetentionSafetyScore = round(1 - Math.min(0.9, timerRetentionCandidates.length / 18));
  const deferredQueueContainmentScore = round(1 - Math.min(0.9, activeDeferred.size / 16));
  const inactiveHydrationCleanupScore = round(1 - Math.min(0.9, inactiveRetentionCount / Math.max(8, backgroundCleanupCount + 8)));
  const mobileMemoryResilienceScore = round(
    (runtimeMemorySafetyScore +
      listenerLeakPreventionScore +
      timerRetentionSafetyScore +
      deferredQueueContainmentScore +
      inactiveHydrationCleanupScore) /
      5,
  );

  return {
    memoryPressureReport: [...events],
    listenerLifecycleDiagnostics: {
      activeListeners: activeListeners.size,
      maxActiveListeners,
      listenerLeakCandidates,
    },
    timerRetentionDiagnostics: {
      activeTimers: activeTimers.size,
      maxActiveTimers,
      timerRetentionCandidates,
    },
    deferredQueueDiagnostics: {
      activeDeferred: activeDeferred.size,
      maxActiveDeferred,
      deferredQueueRetainedMs,
      queueEvictions,
    },
    inactiveHydrationDiagnostics: {
      inactiveRetentionCount,
      backgroundCleanupCount,
      staleClosureEstimateCount,
    },
    cleanupActivityReport: events.filter(
      (event) =>
        event.kind === 'cleanup_activity' ||
        event.kind === 'low_priority_queue_evicted' ||
        event.kind === 'background_memory_cleanup' ||
        event.kind === 'deferred_cancelled',
    ),
    metrics: {
      runtimeMemorySafetyScore,
      listenerLeakPreventionScore,
      timerRetentionSafetyScore,
      deferredQueueContainmentScore,
      inactiveHydrationCleanupScore,
      mobileMemoryResilienceScore,
    },
  };
}

export function resetRuntimeMemoryPressureDefenseForTest(): void {
  events.length = 0;
  activeTimers.clear();
  activeListeners.clear();
  activeDeferred.clear();
  maxActiveTimers = 0;
  maxActiveListeners = 0;
  maxActiveDeferred = 0;
  inactiveRetentionCount = 0;
  staleClosureEstimateCount = 0;
  backgroundCleanupCount = 0;
  queueEvictions = 0;
  lastBackgroundAt = null;
}
