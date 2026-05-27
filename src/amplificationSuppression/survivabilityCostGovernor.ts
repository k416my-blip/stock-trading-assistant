import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetSurvivabilityCostGovernorForTest(): void {
  /* stateless */
}

export function scoreSurvivabilityCost(input: AmplificationSuppressionObserveInput): number {
  let cost = input.observerOverheadRatio * 0.35;
  cost += input.interventionDensity * 0.25;
  cost += (1 - input.equilibriumScore) * 0.2;
  cost += input.telemetryAmplificationScore * 0.15;
  return Math.round(Math.min(1, cost) * 1000) / 1000;
}

export function isSurvivabilityCostHigh(input: AmplificationSuppressionObserveInput): boolean {
  return scoreSurvivabilityCost(input) > 0.55;
}
