import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetUnifiedUtilityConfidenceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeUnifiedUtilityConfidence(
  input: RuntimeUnifiedUtilityObserveInput,
): number {
  const alignment = input.objectiveAlignmentScore;
  const purpose = input.runtimePurposeIntegrityScore;
  const limitation = input.runtimeSelfLimitationScore;
  const coherence = input.runtimeStrategicCoherence;
  return Math.round(((alignment + purpose + limitation + coherence) / 4) * 1000) / 1000;
}
