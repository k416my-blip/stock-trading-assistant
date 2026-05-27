import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetEcologicalConfidenceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeEcologicalConfidence(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  const confidence =
    (input.runtimeUnifiedUtilityConfidence +
      input.crossLayerUtilityConsistency +
      input.runtimePurposeIntegrityScore +
      (1 - input.runtimeExistentialConstraintRisk)) /
    4;
  return Math.round(Math.max(0, Math.min(1, confidence)) * 1000) / 1000;
}
