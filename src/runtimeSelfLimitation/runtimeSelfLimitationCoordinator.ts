import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimeSelfLimitationCoordinatorForTest(): void {
  evolution.length = 0;
}

export function scoreRuntimeSelfLimitation(input: RuntimeSelfLimitationObserveInput): number {
  let score = 0.75;
  score -= input.interventionDensity * 0.12;
  score -= input.observerOverheadRatio * 0.1;
  score -= input.observerDensityScore * 0.08;
  score -= input.recursiveStabilizationRisk * 0.1;
  score -= input.runtimeComplexityScore * 0.08;
  score += input.simplificationIntegrity * 0.08;
  score += input.runtimeHomeostasisScore * 0.07;
  score += input.runtimeStrategicCoherence * 0.07;
  score -= Math.abs(input.metaCoordinationStability - input.equilibriumIntegrity) * 0.1;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getSelfLimitationEvolution(): { at: string; score: number }[] {
  return [...evolution];
}
