import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

const ecologicalEvolution: { at: string; spread: number }[] = [];

export function resetRuntimeEcologicalEvolutionCoordinatorForTest(): void {
  ecologicalEvolution.length = 0;
}

export function scoreEcosystemPersistence(input: RuntimeCivilizationalResilienceObserveInput): number {
  return Math.round(
    ((input.continuityScore / 100) * 0.35 +
      input.crossLayerUtilityConsistency * 0.35 +
      input.runtimeUnifiedUtilityConfidence * 0.3) *
      1000,
  ) / 1000;
}

export function scoreGovernanceVariance(input: RuntimeCivilizationalResilienceObserveInput): number {
  const scores = [
    input.governanceConfidence,
    1 - input.runtimeGovernanceInflationRisk,
    input.runtimeSelfLimitationScore,
    1 - input.runtimeAuditCoverage,
  ];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(
    (scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length) * 1000,
  ) / 1000;
}

export function scoreUtilityDiversity(input: RuntimeCivilizationalResilienceObserveInput): number {
  const scores = [
    input.runtimeUnifiedUtilityScore,
    input.runtimeUtilityIntegrity,
    input.survivabilityEffectiveness,
    input.simplificationIntegrity,
  ];
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round(Math.max(0, Math.min(1, spread)) * 1000) / 1000;
}

export function scoreCivilizationSpread(input: RuntimeCivilizationalResilienceObserveInput): number {
  const spread = scoreUtilityDiversity(input) + scoreGovernanceVariance(input) * 0.5;
  const rounded = Math.round(Math.min(1, spread) * 1000) / 1000;
  ecologicalEvolution.push({ at: new Date().toISOString(), spread: rounded });
  if (ecologicalEvolution.length > 64) ecologicalEvolution.shift();
  return rounded;
}

export function scoreStrategicEcologyIntegrity(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  return Math.round(
    ((input.runtimeStrategicCoherence + input.objectiveAlignmentScore) / 2) * 1000,
  ) / 1000;
}

export function getEcologicalEvolution(): { at: string; spread: number }[] {
  return [...ecologicalEvolution];
}
