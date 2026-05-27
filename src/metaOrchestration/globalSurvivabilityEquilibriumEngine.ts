import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';

const equilibriumEvolution: { at: string; score: number }[] = [];

export function resetGlobalSurvivabilityEquilibriumEngineForTest(): void {
  equilibriumEvolution.length = 0;
}

export function scoreEquilibrium(input: MetaOrchestrationObserveInput, interventionDensity: number): number {
  const layers = [
    input.recoverySuccessRate,
    input.continuityScore / 100,
    input.governanceConfidence,
    1 - input.observerOverheadRatio,
    input.jsSurvivalScore / 100,
    input.runtimeSafeTradingScore / 100,
  ];
  const mean = layers.reduce((a, b) => a + b, 0) / layers.length;
  const variance =
    layers.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, layers.length);
  const balance = 1 - Math.min(1, variance * 2);
  const densityPenalty = interventionDensity * 0.2;
  const score = mean * 0.6 + balance * 0.4 - densityPenalty;
  return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
}

export function noteEquilibriumScore(score: number): void {
  equilibriumEvolution.push({ at: new Date().toISOString(), score });
  if (equilibriumEvolution.length > 64) equilibriumEvolution.shift();
}

export function getEquilibriumEvolution(): { at: string; score: number }[] {
  return [...equilibriumEvolution];
}
