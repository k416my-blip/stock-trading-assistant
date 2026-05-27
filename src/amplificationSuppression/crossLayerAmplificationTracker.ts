import type { AmplificationGraphEdge, AmplificationGraphSnapshot, AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetCrossLayerAmplificationTrackerForTest(): void {
  /* stateless */
}

export function buildAmplificationPropagationGraph(
  input: AmplificationSuppressionObserveInput,
): AmplificationGraphSnapshot {
  const nodes = [
    { id: 'observer', label: 'observer', density: input.observerOverheadRatio },
    { id: 'telemetry', label: 'telemetry', density: input.telemetryAmplificationScore },
    { id: 'recovery', label: 'recovery', density: 1 - input.recoverySuccessRate },
    { id: 'governance', label: 'governance', density: input.governanceMode !== 'full_observe' ? 0.6 : 0.1 },
    { id: 'meta', label: 'meta', density: 1 - input.metaCoordinationStability },
  ];
  const edges: AmplificationGraphEdge[] = [
    { from: 'observer', to: 'telemetry', amplification: input.observerOverheadRatio * input.telemetryAmplificationScore },
    { from: 'telemetry', to: 'recovery', amplification: input.telemetryAmplificationScore * (1 - input.recoverySuccessRate) },
    { from: 'recovery', to: 'governance', amplification: (1 - input.recoverySuccessRate) * 0.5 },
    { from: 'governance', to: 'meta', amplification: 0.4 },
    { from: 'meta', to: 'observer', amplification: input.observerOverheadRatio * 0.3 },
  ];
  return { nodes, edges, measuredAt: new Date().toISOString() };
}
