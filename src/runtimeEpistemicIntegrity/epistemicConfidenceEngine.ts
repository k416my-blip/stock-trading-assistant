import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';

export function resetEpistemicConfidenceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeEpistemicConfidence(input: RuntimeEpistemicIntegrityObserveInput): number {
  const confidence =
    (input.runtimeEcologicalConfidence +
      input.runtimeUnifiedUtilityConfidence +
      input.runtimePurposeIntegrityScore +
      (1 - input.recursiveGovernanceEcologyRisk)) /
    4;
  return Math.round(Math.max(0, Math.min(1, confidence)) * 1000) / 1000;
}
