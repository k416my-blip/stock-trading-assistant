import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

const equilibriumEvolution: { at: string; integrity: number }[] = [];

export function resetRuntimeSimplificationEquilibriumCoordinatorForTest(): void {
  equilibriumEvolution.length = 0;
}

export function scoreSimplificationIntegrity(input: ComplexityCompressionObserveInput): number {
  const compressionBalance = scoreCompressionBalance(input);
  const factors = [
    input.survivabilityEffectiveness,
    input.continuityScore / 100,
    1 - (input.thermalState === 'severe' || input.thermalState === 'critical' ? 0.4 : 0.1),
    1 - input.observerOverheadRatio,
    input.runtimeEquilibriumStability,
    compressionBalance,
  ];
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
  const spread = Math.max(...factors) - Math.min(...factors);
  const integrity = mean * (1 - spread * 0.35);
  const rounded = Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
  equilibriumEvolution.push({ at: new Date().toISOString(), integrity: rounded });
  if (equilibriumEvolution.length > 64) equilibriumEvolution.shift();
  return rounded;
}

function scoreCompressionBalance(input: ComplexityCompressionObserveInput): number {
  const cost = input.observerOverheadRatio + input.telemetryAmplificationScore;
  const benefit = input.survivabilityEffectiveness + input.continuityScore / 100;
  return Math.min(1, benefit / (cost + 0.4));
}

export function getEquilibriumEvolution(): { at: string; integrity: number }[] {
  return [...equilibriumEvolution];
}
