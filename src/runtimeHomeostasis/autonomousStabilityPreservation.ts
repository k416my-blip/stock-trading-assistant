import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetAutonomousStabilityPreservationForTest(): void {
  /* stateless */
}

export function shouldPreserveObserveOnly(input: RuntimeHomeostasisObserveInput): boolean {
  return (
    input.interventionDensity > 0.62 &&
    input.observerOverheadRatio > 0.52 &&
    input.runtimeAuditCoverage > 0.8 &&
    input.runtimeComplexityScore > 0.48
  );
}

export function scorePreservationReadiness(input: RuntimeHomeostasisObserveInput): number {
  let ready = 0.5;
  if (input.continuityScore > 72) ready += 0.2;
  if (input.runtimeSafeTradingScore > 62) ready += 0.15;
  if (shouldPreserveObserveOnly(input)) ready += 0.15;
  return Math.round(Math.min(1, ready) * 1000) / 1000;
}
