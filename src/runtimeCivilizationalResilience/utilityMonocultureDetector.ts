import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetUtilityMonocultureDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeUtilityMonocultureRisk(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  const utility = input.runtimeUnifiedUtilityScore;
  const spread = Math.abs(utility - input.survivabilityEffectiveness);
  let risk = spread;
  if (utility > 0.72 && input.simplificationIntegrity < 0.55) risk += 0.2;
  if (utility > 0.7 && input.objectiveAlignmentScore < 0.6) risk += 0.18;
  if (input.crossLayerUtilityConsistency > 0.75 && input.layerConflictRisk > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
