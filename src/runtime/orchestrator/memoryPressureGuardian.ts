/**
 * Memory leak defense — heap slope, stale timers, cleanup triggers.
 */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { RUNTIME_KERNEL_OWNS_POLICY } from '../../constants/runtimeKernel';
import { persistTelemetryCycle } from '../../services/runtimeTelemetryStorage';
import { cleanupDuplicateTimers } from '../../services/mobileRedmiRuntime';
import { cancelAsyncTasksByLabel } from './asyncPriorityScheduler';

type HeapSample = { at: number; mb: number };

const samples: HeapSample[] = [];
let staleTimerCount = 0;
let orphanSubscriptionCount = 0;
let retainedWsRefCount = 0;
let lastCleanupAt = 0;
let lastTelemetryEmitAt = 0;

export function resetMemoryPressureGuardianForTest(): void {
  samples.length = 0;
  staleTimerCount = 0;
  orphanSubscriptionCount = 0;
  retainedWsRefCount = 0;
  lastCleanupAt = 0;
  lastTelemetryEmitAt = 0;
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

export function observeMemoryPressure(metrics: RuntimeTelemetryMetricsSnapshot): {
  slopePct: number;
  cleanupTriggered: boolean;
  thresholdExceeded: boolean;
} {
  const now = Date.now();
  samples.push({ at: now, mb: metrics.jsHeapEstimateMb });
  if (samples.length > 48) samples.shift();

  const slopePct = Math.max(metrics.memoryTrendPct, heapGrowthSlopePct());
  const thresholdExceeded =
    slopePct >= 42 ||
    metrics.asyncQueueDepth >= 45 ||
    staleTimerCount >= 4 ||
    orphanSubscriptionCount >= 3 ||
    retainedWsRefCount >= 2;

  let cleanupTriggered = false;
  if (thresholdExceeded && now - lastCleanupAt > 30_000) {
    cleanupTriggered = true;
    lastCleanupAt = now;
    cleanupDuplicateTimers();
    cancelAsyncTasksByLabel('orphan-');
    cancelAsyncTasksByLabel('stale-');
    staleTimerCount = Math.max(0, staleTimerCount - 2);
    orphanSubscriptionCount = 0;
    retainedWsRefCount = Math.max(0, retainedWsRefCount - 1);

    if (!RUNTIME_KERNEL_OWNS_POLICY && now - lastTelemetryEmitAt > 60_000) {
      lastTelemetryEmitAt = now;
      void persistTelemetryCycle({
        metrics,
        state: 'TELEMETRY_DEGRADED',
        summaryJa: `memory guardian cleanup · slope ${slopePct}%`,
        longSession: metrics.longSession,
      });
    }
  }

  return { slopePct, cleanupTriggered, thresholdExceeded };
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
