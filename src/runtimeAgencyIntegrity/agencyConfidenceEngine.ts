import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';

export function resetAgencyConfidenceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeAgencyConfidence(input: RuntimeAgencyIntegrityObserveInput): number {
  const confidence =
    (input.runtimeEpistemicConfidence +
      input.runtimeSelfLimitationScore +
      input.crossLayerEpistemicConsistency +
      (1 - input.recursiveBeliefReinforcementRisk)) /
    4;
  return Math.round(Math.max(0, Math.min(1, confidence)) * 1000) / 1000;
}
