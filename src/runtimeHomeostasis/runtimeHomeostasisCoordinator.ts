import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

const homeostasisHistory: { at: string; score: number }[] = [];

export function resetRuntimeHomeostasisCoordinatorForTest(): void {
  homeostasisHistory.length = 0;
}

export function scoreRuntimeHomeostasis(input: RuntimeHomeostasisObserveInput): number {
  let score = input.recoverySuccessRate * 0.15;
  score += (input.continuityScore / 100) * 0.15;
  score += input.runtimeEquilibriumStability * 0.12;
  score += input.simplificationIntegrity * 0.1;
  score += input.survivabilityEffectiveness * 0.1;
  score += (1 - input.runtimeAmplificationRisk) * 0.1;
  score += (1 - input.runtimeComplexityScore) * 0.08;
  score += input.governanceConfidence * 0.1;
  score += (1 - input.runtimeEntropyScore) * 0.1;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  homeostasisHistory.push({ at: new Date().toISOString(), score: rounded });
  if (homeostasisHistory.length > 64) homeostasisHistory.shift();
  return rounded;
}

export function getHomeostasisHistory(): { at: string; score: number }[] {
  return [...homeostasisHistory];
}
