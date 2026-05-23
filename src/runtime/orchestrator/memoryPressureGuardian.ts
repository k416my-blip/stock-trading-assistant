/**
 * Memory pressure observation (sample) vs cleanup (effect executor only).
 */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { cleanupDuplicateTimers } from '../../services/mobileRedmiRuntime';
import { cancelAsyncTasksByLabel } from './asyncPriorityScheduler';

type HeapSample = { at: number; mb: number };

const samples: HeapSample[] = [];
let staleTimerCount = 0;
let orphanSubscriptionCount = 0;
let retainedWsRefCount = 0;
let lastCleanupAt = 0;
let lastCleanupRecommended = false;

const CLEANUP_COOLDOWN_MS = 30_000;

export function resetMemoryPressureGuardianForTest(): void {
  samples.length = 0;
  staleTimerCount = 0;
  orphanSubscriptionCount = 0;
  retainedWsRefCount = 0;
  lastCleanupAt = 0;
  lastCleanupRecommended = false;
}

export function noteStaleTimerDetected(): void {
  staleTimerCount += 1;
}

export function noteOrphanSubscription(): void {
  orphanSubscriptionCount += 1;
}

export function noteRetainedWebsocketRef(): void {
  retainedWsRefCount += 1;
}

function heapGrowthSlopePct(): number {
  if (samples.length < 3) return 0;
  const first = samples[0].mb;
  const last = samples.at(-1)!.mb;
  if (first <= 0) return Math.round(last);
  return Math.min(100, Math.round(((last - first) / first) * 100));
}

function thresholdExceeded(metrics: RuntimeTelemetryMetricsSnapshot, slopePct: number): boolean {
  return (
    slopePct >= 42 ||
    metrics.asyncQueueDepth >= 45 ||
    staleTimerCount >= 4 ||
    orphanSubscriptionCount >= 3 ||
    retainedWsRefCount >= 2
  );
}

/** Signal sampling only — no cleanup side effects. */
export function recordMemoryPressureSample(metrics: RuntimeTelemetryMetricsSnapshot): {
  slopePct: number;
  thresholdExceeded: boolean;
  cleanupRecommended: boolean;
} {
  const now = Date.now();
  samples.push({ at: now, mb: metrics.jsHeapEstimateMb });
  if (samples.length > 48) samples.shift();

  const slopePct = Math.max(metrics.memoryTrendPct, heapGrowthSlopePct());
  const exceeded = thresholdExceeded(metrics, slopePct);
  const cleanupRecommended = exceeded && now - lastCleanupAt > CLEANUP_COOLDOWN_MS;
  lastCleanupRecommended = cleanupRecommended;

  return { slopePct, thresholdExceeded: exceeded, cleanupRecommended };
}

/** Kernel policy emit — reads last sample without re-recording. */
export function shouldEmitMemoryPressureCleanup(): boolean {
  return lastCleanupRecommended;
}

/** Executed only via MEMORY_PRESSURE_CLEANUP effect. */
export function executeMemoryPressureCleanup(
  metrics: RuntimeTelemetryMetricsSnapshot,
): { cleanupTriggered: boolean; slopePct: number } {
  const observation = recordMemoryPressureSample(metrics);
  const now = Date.now();
  if (!observation.cleanupRecommended) {
    return { cleanupTriggered: false, slopePct: observation.slopePct };
  }

  lastCleanupAt = now;
  cleanupDuplicateTimers();
  cancelAsyncTasksByLabel('orphan-');
  cancelAsyncTasksByLabel('stale-');
  staleTimerCount = Math.max(0, staleTimerCount - 2);
  orphanSubscriptionCount = 0;
  retainedWsRefCount = Math.max(0, retainedWsRefCount - 1);

  return { cleanupTriggered: true, slopePct: observation.slopePct };
}

/** @deprecated Use recordMemoryPressureSample + executeMemoryPressureCleanup via effects. */
export function observeMemoryPressure(metrics: RuntimeTelemetryMetricsSnapshot): {
  slopePct: number;
  cleanupTriggered: boolean;
  thresholdExceeded: boolean;
} {
  const observation = recordMemoryPressureSample(metrics);
  if (!observation.cleanupRecommended) {
    return {
      slopePct: observation.slopePct,
      cleanupTriggered: false,
      thresholdExceeded: observation.thresholdExceeded,
    };
  }
  const result = executeMemoryPressureCleanup(metrics);
  return {
    slopePct: result.slopePct,
    cleanupTriggered: result.cleanupTriggered,
    thresholdExceeded: observation.thresholdExceeded,
  };
}

export function getMemoryGuardianStats(): {
  slopePct: number;
  staleTimers: number;
  orphanSubscriptions: number;
  retainedWsRefs: number;
} {
  return {
    slopePct: heapGrowthSlopePct(),
    staleTimers: staleTimerCount,
    orphanSubscriptions: orphanSubscriptionCount,
    retainedWsRefs: retainedWsRefCount,
  };
}
