import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetRuntimeOverloadStabilizerForTest(): void {
  /* stateless */
}

export function scoreStabilizationOverhead(input: AmplificationSuppressionObserveInput): number {
  let overhead = input.observerOverheadRatio * 0.4;
  overhead += input.interventionDensity * 0.3;
  overhead += Math.min(0.2, input.eventLoopLagMs / 2000);
  return Math.round(Math.min(1, overhead) * 1000) / 1000;
}

export function isOverloadStabilizationActive(input: AmplificationSuppressionObserveInput): boolean {
  return input.eventLoopLagMs > 300 || input.observerOverheadRatio > 0.55;
}
