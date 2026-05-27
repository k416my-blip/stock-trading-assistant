import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetUtilityContinuityAnalyzerForTest(): void {
  /* stateless */
}

export function scoreUtilityContinuity(input: RuntimePurposeIntegrityObserveInput): number {
  const continuity = input.continuityScore / 100;
  const recovery = input.recoverySuccessRate;
  const latency = 1 - Math.min(1, input.eventLoopLagMs / 500);
  return Math.round(((continuity + recovery + latency) / 3) * 1000) / 1000;
}
