import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetStabilityReboundSuppressorForTest(): void {
  /* stateless */
}

export function shouldSuppressRebound(input: RuntimeHomeostasisObserveInput): boolean {
  return (
    input.recoverySuccessRate > 0.75 &&
    (input.telemetryAmplificationScore > 0.4 || input.observerOverheadRatio > 0.45)
  );
}

export function scoreReboundRisk(input: RuntimeHomeostasisObserveInput): number {
  if (!shouldSuppressRebound(input)) return 0.1;
  let risk = 0.3;
  risk += input.telemetryAmplificationScore * 0.25;
  risk += input.observerOverheadRatio * 0.2;
  risk += input.runtimeComplexityScore * 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
