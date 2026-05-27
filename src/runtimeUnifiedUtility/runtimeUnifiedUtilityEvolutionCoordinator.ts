import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

const equilibriumEvolution: { at: string; variance: number }[] = [];

export function resetRuntimeUnifiedUtilityEvolutionCoordinatorForTest(): void {
  equilibriumEvolution.length = 0;
}

export function scoreUtilityPersistence(input: RuntimeUnifiedUtilityObserveInput): number {
  return Math.round(
    ((input.continuityScore / 100) * 0.4 +
      input.longSessionPurposeIntegrity * 0.3 +
      input.runtimeUtilityIntegrity * 0.3) *
      1000,
  ) / 1000;
}

export function scoreUtilityEquilibriumVariance(input: RuntimeUnifiedUtilityObserveInput): number {
  const scores = [
    input.runtimeHomeostasisScore,
    input.runtimeStrategicCoherence,
    input.simplificationIntegrity,
    input.survivabilityEffectiveness,
    1 - input.interventionDensity,
  ];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length;
  const rounded = Math.round(variance * 1000) / 1000;
  equilibriumEvolution.push({ at: new Date().toISOString(), variance: rounded });
  if (equilibriumEvolution.length > 64) equilibriumEvolution.shift();
  return rounded;
}

export function scoreStrategicIntegrity(input: RuntimeUnifiedUtilityObserveInput): number {
  return Math.round(
    ((input.runtimeStrategicCoherence + input.objectiveAlignmentScore) / 2) * 1000,
  ) / 1000;
}

export function scorePurposeConsistency(input: RuntimeUnifiedUtilityObserveInput): number {
  return Math.round(
    ((input.runtimePurposeIntegrityScore + (1 - input.runtimePurposeDriftRisk)) / 2) * 1000,
  ) / 1000;
}

export function getEquilibriumEvolution(): { at: string; variance: number }[] {
  return [...equilibriumEvolution];
}
