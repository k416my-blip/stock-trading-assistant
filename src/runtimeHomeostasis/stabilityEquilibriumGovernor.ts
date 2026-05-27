import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetStabilityEquilibriumGovernorForTest(): void {
  /* stateless */
}

export function scoreEquilibriumIntegrity(input: RuntimeHomeostasisObserveInput): number {
  const factors = [
    input.equilibriumScore,
    input.runtimeEquilibriumStability,
    input.metaCoordinationStability,
    input.simplificationIntegrity,
    input.survivabilityEffectiveness,
    input.continuityScore / 100,
  ];
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
  const spread = Math.max(...factors) - Math.min(...factors);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.4))) * 1000) / 1000;
}

export function scoreEquilibriumPersistence(input: RuntimeHomeostasisObserveInput): number {
  let persistence = input.runtimeEquilibriumStability * 0.4;
  persistence += scoreEquilibriumIntegrity(input) * 0.35;
  persistence += (1 - input.runtimeEntropyScore) * 0.15;
  if (input.eventLoopLagMs < 200) persistence += 0.1;
  return Math.round(Math.min(1, persistence) * 1000) / 1000;
}
