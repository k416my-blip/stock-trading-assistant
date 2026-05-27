import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetSurvivabilityAwareConfidenceScalerForTest(): void {
  /* stateless */
}

export function scaleSurvivabilityWeightedConfidence(input: TradingSafetyObserveInput): number {
  let conf = input.governanceConfidence * 0.3;
  conf += (input.runtimeSafeTradingScore / 100) * 0.25;
  conf += input.recoverySuccessRate * 0.2;
  conf += (input.continuityScore / 100) * 0.15;
  conf += input.equilibriumScore * 0.1;
  return Math.round(Math.max(0, Math.min(1, conf)) * 1000) / 1000;
}

export function scaleRecommendationConfidence(
  weighted: number,
  instabilityRisk: number,
): number {
  return Math.round(Math.max(0, Math.min(1, weighted * (1 - instabilityRisk * 0.5))) * 1000) / 1000;
}
