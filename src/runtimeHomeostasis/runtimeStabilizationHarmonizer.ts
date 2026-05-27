import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetRuntimeStabilizationHarmonizerForTest(): void {
  /* stateless */
}

export function scoreRuntimeHarmonyIndex(input: RuntimeHomeostasisObserveInput): number {
  const factors = [
    input.runtimeEquilibriumStability,
    input.simplificationIntegrity,
    input.survivabilityEffectiveness,
    input.continuityScore / 100,
    1 - input.runtimeEntropyScore,
    input.runtimeCompressionEfficiency,
  ];
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
  const variance = factors.reduce((a, b) => a + (b - mean) ** 2, 0) / factors.length;
  return Math.round(Math.max(0, Math.min(1, mean * (1 - variance))) * 1000) / 1000;
}

export function buildStabilizationPressureHeatmap(
  input: RuntimeHomeostasisObserveInput,
): Record<string, number> {
  return {
    thermal: input.thermalState === 'none' ? 0.05 : 0.45,
    intervention: Math.round(input.interventionDensity * 1000) / 1000,
    suppression: Math.round(input.runtimeTradingSuppression * 1000) / 1000,
    compression: Math.round(input.compressionDriftEstimate * 1000) / 1000,
    entropy: Math.round(input.runtimeEntropyScore * 1000) / 1000,
  };
}
