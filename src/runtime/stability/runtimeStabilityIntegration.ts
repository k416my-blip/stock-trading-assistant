import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';
import { runUnifiedRuntimeLayersTick } from '../unified/runtimeUnifiedOrchestratorIntegration';

/** Signal collection tick — delegates to Unified Runtime Orchestrator (layers 1–6). */
export function observeRuntimeStabilityTick(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RuntimeStabilitySnapshot {
  return runUnifiedRuntimeLayersTick(metrics, performance).stabilitySnapshot;
}

export { selectRuntimeStabilitySnapshot, selectRuntimeHealthScore } from './runtimeStabilitySelectors';
