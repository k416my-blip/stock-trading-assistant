import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

export function resetAdaptiveObjectiveBalancingForTest(): void {
  /* stateless */
}

export function scoreAdaptiveObjectiveConfidence(input: StrategicCoherenceObserveInput): number {
  let conf = input.governanceConfidence * 0.3;
  conf += input.runtimeHomeostasisScore * 0.25;
  conf += input.equilibriumIntegrity * 0.2;
  conf += (1 - input.stabilityDriftRisk) * 0.15;
  conf += input.metaCoordinationStability * 0.1;
  return Math.round(Math.max(0, Math.min(1, conf)) * 1000) / 1000;
}

export function balanceObjectives(input: StrategicCoherenceObserveInput): Record<string, number> {
  return {
    continuity: input.continuityScore / 100,
    survivability: input.survivabilityEffectiveness,
    compression: input.simplificationIntegrity,
    homeostasis: input.runtimeHomeostasisScore,
  };
}
