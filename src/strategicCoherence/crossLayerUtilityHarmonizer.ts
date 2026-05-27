import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

export function resetCrossLayerUtilityHarmonizerForTest(): void {
  /* stateless */
}

export function scoreGlobalUtilityBalance(input: StrategicCoherenceObserveInput): number {
  const utility =
    (input.continuityScore / 100) * 0.2 +
    input.survivabilityEffectiveness * 0.2 +
    (1 - input.observerOverheadRatio) * 0.15 +
    (1 - Math.min(1, input.eventLoopLagMs / 500)) * 0.15 +
    input.runtimeEquilibriumStability * 0.15 +
    input.runtimeCompressionEfficiency * 0.1 +
    (1 - input.interventionDensity) * 0.05;
  return Math.round(Math.max(0, Math.min(1, utility)) * 1000) / 1000;
}

export function scoreRuntimeStrategicHarmony(input: StrategicCoherenceObserveInput): number {
  const factors = [
    scoreGlobalUtilityBalance(input),
    input.runtimeHomeostasisScore,
    input.equilibriumIntegrity,
    input.simplificationIntegrity,
    input.continuityScore / 100,
  ];
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
  const variance = factors.reduce((a, b) => a + (b - mean) ** 2, 0) / factors.length;
  return Math.round(Math.max(0, Math.min(1, mean * (1 - variance))) * 1000) / 1000;
}
