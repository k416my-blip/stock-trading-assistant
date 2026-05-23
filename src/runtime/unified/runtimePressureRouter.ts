/** Runtime Pressure Router — aggregate pressures for state machine. */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import { computeAsyncPressure } from './asyncBurstSuppressor';

export function computeRuntimePressure(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): number {
  const cpuProxy = Math.min(1, metrics.eventLoopLatencyMs / 200);
  const heap = metrics.memoryTrendPct / 100;
  const asyncP = computeAsyncPressure(metrics);
  const thermal =
    metrics.thermalState === 'severe' || metrics.thermalState === 'critical' ? 0.9 : metrics.memoryTrendPct > 60 ? 0.4 : 0.1;
  const bg = performance.appForeground ? 0 : 0.35;
  return Math.round(Math.min(1, cpuProxy * 0.3 + heap * 0.3 + asyncP * 0.2 + thermal * 0.1 + bg * 0.1) * 1000) / 1000;
}
