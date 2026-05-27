import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetCrossLayerObserveConsistencyHarmonizerForTest(): void {
  /* stateless */
}

export function scoreCrossLayerObserveConsistency(input: RuntimeObserverRecursionObserveInput): number {
  const scores = [
    1 - input.observerOverheadRatio,
    1 - input.observerDensityScore,
    1 - input.telemetryAmplificationScore,
    1 - input.runtimeAuditCoverage,
  ];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(mean * 1000) / 1000;
}
