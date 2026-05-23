/** Battery Governance Layer — unified battery policy. */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

export function resolveBatteryGovernance(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): { survivalOnly: boolean; batterySaver: boolean } {
  const batterySaver = performance.batterySaverActive || metrics.native.batterySaverActive;
  return { survivalOnly: batterySaver, batterySaver };
}
