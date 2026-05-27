import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetUtilityDiversityScorerForTest(): void {
  /* stateless */
}

export function scoreUtilityDiversityIndex(input: RuntimeCivilizationalResilienceObserveInput): number {
  const values = [
    input.runtimeUnifiedUtilityScore,
    input.runtimePurposeIntegrityScore,
    input.survivabilityEffectiveness,
    input.simplificationIntegrity,
    input.objectiveAlignmentScore,
  ];
  const spread = Math.max(...values) - Math.min(...values);
  return Math.round(Math.max(0, Math.min(1, spread)) * 1000) / 1000;
}
