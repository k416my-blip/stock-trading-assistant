import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimePurposeIntegrityCoordinatorForTest(): void {
  evolution.length = 0;
}

export function scoreRuntimePurposeIntegrity(input: RuntimePurposeIntegrityObserveInput): number {
  let score = (input.continuityScore / 100) * 0.15;
  score += input.survivabilityEffectiveness * 0.12;
  score += input.simplificationIntegrity * 0.1;
  score += input.runtimeStrategicCoherence * 0.1;
  score += input.runtimeHomeostasisScore * 0.08;
  score += input.objectiveAlignmentScore * 0.08;
  score += (1 - input.interventionDensity) * 0.1;
  score += (1 - Math.min(1, input.eventLoopLagMs / 500)) * 0.12;
  score += input.runtimeSelfLimitationScore * 0.08;
  score -= input.runtimeComplexityScore * 0.06;
  score -= input.metaRecursionRisk * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getPurposeEvolutionTimeline(): { at: string; score: number }[] {
  return [...evolution];
}
