/**
 * Adaptive Curiosity Decay — reduce curiosity under high risk.
 */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

export function computeCuriosityDecayFactor(
  metrics: RuntimeTelemetryMetricsSnapshot,
  fossilizationRisk: number,
  rollbackAddictionRisk: number,
): number {
  let factor = 1;
  if (metrics.thermalState === 'severe' || metrics.thermalState === 'moderate') factor *= 0.7;
  if (metrics.memoryTrendPct > 75) factor *= 0.85;
  factor *= 1 - Math.min(0.4, fossilizationRisk * 0.25 + rollbackAddictionRisk * 0.25);
  return Math.round(Math.max(0.2, factor) * 1000) / 1000;
}
