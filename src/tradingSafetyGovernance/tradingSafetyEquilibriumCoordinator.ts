import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

const equilibriumEvolution: { at: string; score: number }[] = [];

export function resetTradingSafetyEquilibriumCoordinatorForTest(): void {
  equilibriumEvolution.length = 0;
}

export function scoreTradingSafetyEquilibrium(
  input: TradingSafetyObserveInput,
  tradingRisk: number,
  weightedConfidence: number,
): number {
  const layers = [
    1 - tradingRisk,
    weightedConfidence,
    input.equilibriumScore,
    input.metaCoordinationStability,
    input.runtimeSafeTradingScore / 100,
  ];
  const mean = layers.reduce((a, b) => a + b, 0) / layers.length;
  equilibriumEvolution.push({ at: new Date().toISOString(), score: mean });
  if (equilibriumEvolution.length > 64) equilibriumEvolution.shift();
  return Math.round(Math.max(0, Math.min(1, mean)) * 1000) / 1000;
}

export function getTradingEquilibriumEvolution(): { at: string; score: number }[] {
  return [...equilibriumEvolution];
}
