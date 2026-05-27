import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetPurposeIntegrityConfidenceEngineForTest(): void {
  /* stateless */
}

export function scorePurposeIntegrityConfidence(input: RuntimePurposeIntegrityObserveInput): number {
  const alignment = input.objectiveAlignmentScore;
  const coherence = input.runtimeStrategicCoherence;
  const limitation = input.runtimeSelfLimitationScore;
  const simplicity = input.simplificationIntegrity;
  return Math.round(((alignment + coherence + limitation + simplicity) / 4) * 1000) / 1000;
}
