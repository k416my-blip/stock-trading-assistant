import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetRuntimeAmplificationDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeAmplificationRisk(input: AmplificationSuppressionObserveInput): number {
  let risk = input.observerOverheadRatio * 0.3;
  risk += input.telemetryAmplificationScore * 0.25;
  risk += (1 - input.recoverySuccessRate) * 0.15;
  risk += Math.min(0.15, input.interventionDensity);
  if (input.runtimeAmplificationRisk > 0) risk += input.runtimeAmplificationRisk * 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function scoreAmplificationPressure(input: AmplificationSuppressionObserveInput): number {
  return Math.round(
    Math.min(1, scoreRuntimeAmplificationRisk(input) * 0.6 + input.observerOverheadRatio * 0.4) * 1000,
  ) / 1000;
}
