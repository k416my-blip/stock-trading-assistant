import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetInterventionValueAnalyzerForTest(): void {
  /* stateless */
}

export function scoreInterventionValueDensity(input: ComplexityCompressionObserveInput): number {
  if (input.interventionDensity <= 0) return 0.5;
  const value =
    (input.survivabilityEffectiveness + input.continuityScore / 100 + input.recoverySuccessRate) / 3;
  return Math.round(Math.max(0, Math.min(1, value / (input.interventionDensity + 0.2))) * 1000) / 1000;
}

export function buildInterventionValueDistribution(
  input: ComplexityCompressionObserveInput,
): { label: string; value: number }[] {
  const density = input.interventionDensity;
  return [
    { label: 'high_value', value: Math.round(scoreInterventionValueDensity(input) * 1000) / 1000 },
    { label: 'medium_value', value: Math.round(Math.max(0, 0.6 - density) * 1000) / 1000 },
    { label: 'low_value', value: Math.round(Math.min(1, density * 0.8) * 1000) / 1000 },
  ];
}
