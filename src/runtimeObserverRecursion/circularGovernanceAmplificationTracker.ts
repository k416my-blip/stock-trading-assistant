import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetCircularGovernanceAmplificationTrackerForTest(): void {
  /* stateless */
}

export function scoreCircularGovernanceAmplification(input: RuntimeObserverRecursionObserveInput): number {
  let risk = 0;
  if (input.governanceConfidence > 0.75 && input.observerOverheadRatio > 0.4) risk += 0.3;
  if (input.interventionDensity > 0.45 && input.telemetryAmplificationScore > 0.4) risk += 0.25;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
