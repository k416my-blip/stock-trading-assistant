import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetCrossLayerSpreadCalculatorForTest(): void {
  /* stateless */
}

export function scoreCrossLayerSpread(input: RuntimeUnifiedUtilityObserveInput): number {
  const layers = [
    input.runtimeHomeostasisScore,
    input.runtimeStrategicCoherence,
    input.runtimeSelfLimitationScore,
    input.runtimePurposeIntegrityScore,
    input.runtimeCompressionEfficiency,
    1 - input.runtimeAmplificationRisk,
  ];
  return Math.round((Math.max(...layers) - Math.min(...layers)) * 1000) / 1000;
}
