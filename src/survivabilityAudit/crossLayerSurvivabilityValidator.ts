import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetCrossLayerSurvivabilityValidatorForTest(): void {
  /* stateless */
}

export function scoreCrossLayerValidation(input: SurvivabilityAuditObserveInput): number {
  const layers = [
    input.recoverySuccessRate,
    input.governanceConfidence,
    input.equilibriumScore,
    1 - input.runtimeAmplificationRisk,
    input.metaCoordinationStability,
    input.runtimeEquilibriumStability,
  ];
  const mean = layers.reduce((a, b) => a + b, 0) / layers.length;
  const variance = layers.reduce((a, b) => a + (b - mean) ** 2, 0) / layers.length;
  return Math.round(Math.max(0, 1 - variance * 2) * 1000) / 1000;
}
