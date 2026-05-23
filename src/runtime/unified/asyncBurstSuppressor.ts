/** Async Burst Suppressor — cap async storm per tick. */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { UNIFIED_ASYNC_QUEUE_BURST_THRESHOLD, UNIFIED_MAX_ASYNC_BURST } from '../../constants/runtimeUnifiedOrchestrator';

let burstThisTick = 0;

export function resetAsyncBurstSuppressorForTest(): void {
  burstThisTick = 0;
}

export function beginAsyncBurstTick(): void {
  burstThisTick = 0;
}

export function shouldSuppressAsyncBurst(metrics: RuntimeTelemetryMetricsSnapshot): boolean {
  if (metrics.asyncQueueDepth > UNIFIED_ASYNC_QUEUE_BURST_THRESHOLD) return true;
  return burstThisTick >= UNIFIED_MAX_ASYNC_BURST;
}

export function noteAsyncBurst(): void {
  burstThisTick += 1;
}

export function computeAsyncPressure(metrics: RuntimeTelemetryMetricsSnapshot): number {
  return Math.min(1, metrics.asyncQueueDepth / UNIFIED_ASYNC_QUEUE_BURST_THRESHOLD);
}
