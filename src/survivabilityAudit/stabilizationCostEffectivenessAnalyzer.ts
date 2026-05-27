import type { AuditGraphSnapshot, SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetStabilizationCostEffectivenessAnalyzerForTest(): void {
  /* stateless */
}

export function scoreStabilizationCostEfficiency(input: SurvivabilityAuditObserveInput): number {
  const improvement = (input.recoverySuccessRate + input.continuityScore / 100) / 2;
  const cost =
    input.observerOverheadRatio * 0.35 +
    input.telemetryAmplificationScore * 0.3 +
    (input.thermalState !== 'none' && input.thermalState !== 'light' ? 0.2 : 0.05);
  if (cost <= 0) return improvement;
  return Math.round(Math.max(0, Math.min(1, improvement / (cost + 0.3))) * 1000) / 1000;
}

export function buildStabilizationCostGraph(input: SurvivabilityAuditObserveInput): AuditGraphSnapshot {
  return {
    nodes: [
      { id: 'improvement', label: 'improvement', score: scoreStabilizationCostEfficiency(input) },
      { id: 'overhead', label: 'observer_overhead', score: input.observerOverheadRatio },
      { id: 'telemetry', label: 'telemetry_amp', score: input.telemetryAmplificationScore },
      { id: 'thermal', label: 'thermal', score: input.thermalState === 'none' ? 0.05 : 0.4 },
    ],
    edges: [
      { from: 'improvement', to: 'overhead', weight: input.observerOverheadRatio },
      { from: 'improvement', to: 'telemetry', weight: input.telemetryAmplificationScore },
    ],
    measuredAt: new Date().toISOString(),
  };
}
