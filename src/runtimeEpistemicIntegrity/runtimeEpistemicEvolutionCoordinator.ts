import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';

const epistemicEvolution: { at: string; variance: number }[] = [];

export function resetRuntimeEpistemicEvolutionCoordinatorForTest(): void {
  epistemicEvolution.length = 0;
}

export function scoreBeliefVariance(input: RuntimeEpistemicIntegrityObserveInput): number {
  const beliefs = [
    input.runtimeUnifiedUtilityScore,
    input.runtimePurposeIntegrityScore,
    input.survivabilityEffectiveness,
    input.objectiveAlignmentScore,
    1 - input.observerOverheadRatio,
  ];
  const mean = beliefs.reduce((a, b) => a + b, 0) / beliefs.length;
  return Math.round(
    (beliefs.reduce((a, b) => a + (b - mean) ** 2, 0) / beliefs.length) * 1000,
  ) / 1000;
}

export function scoreRealitySpread(input: RuntimeEpistemicIntegrityObserveInput): number {
  const realities = [
    input.continuityScore / 100,
    input.runtimeUtilityIntegrity,
    input.runtimeCivilizationScore,
    input.crossLayerEcologyIntegrity,
  ];
  return Math.round((Math.max(...realities) - Math.min(...realities)) * 1000) / 1000;
}

export function scoreObserverRecursion(input: RuntimeEpistemicIntegrityObserveInput): number {
  return Math.round(
    (input.observerDensityScore * 0.4 +
      input.telemetryAmplificationScore * 0.3 +
      input.metaRecursionRisk * 0.3) *
      1000,
  ) / 1000;
}

export function scoreEpistemicRigidity(input: RuntimeEpistemicIntegrityObserveInput): number {
  let rigidity = input.equilibriumPersistence * 0.3;
  rigidity += input.runtimeCalmnessIndex * 0.25;
  rigidity += (1 - input.simplificationIntegrity) * 0.2;
  rigidity += input.runtimeStabilityIdeologyRisk * 0.2;
  const rounded = Math.round(Math.min(1, rigidity) * 1000) / 1000;
  epistemicEvolution.push({ at: new Date().toISOString(), variance: rounded });
  if (epistemicEvolution.length > 64) epistemicEvolution.shift();
  return rounded;
}

export function scoreWorldviewDiversity(input: RuntimeEpistemicIntegrityObserveInput): number {
  const views = [
    input.runtimeStrategicCoherence,
    input.objectiveAlignmentScore,
    input.simplificationIntegrity,
    input.runtimeCompressionEfficiency,
    1 - input.runtimeTradingSuppression,
  ];
  const spread = Math.max(...views) - Math.min(...views);
  return Math.round(Math.max(0, Math.min(1, spread)) * 1000) / 1000;
}

export function scoreCoherenceEvolution(input: RuntimeEpistemicIntegrityObserveInput): number {
  return Math.round(
    ((input.runtimeStrategicCoherence + input.crossLayerEcologyIntegrity) / 2) * 1000,
  ) / 1000;
}

export function getEpistemicEvolution(): { at: string; variance: number }[] {
  return [...epistemicEvolution];
}
