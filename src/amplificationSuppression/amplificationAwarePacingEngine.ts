import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetAmplificationAwarePacingEngineForTest(): void {
  /* stateless */
}

export function computeAmplificationPacingMultiplier(input: AmplificationSuppressionObserveInput): number {
  let mult = 1;
  mult += input.observerOverheadRatio * 0.8;
  mult += input.telemetryAmplificationScore * 0.6;
  mult += input.interventionDensity * 0.5;
  if (input.miuiAggressiveReclaim) mult += 0.4;
  return Math.round(mult * 100) / 100;
}
