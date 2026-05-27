import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';
import { scoreRuntimeHomeostasis, getHomeostasisHistory } from './runtimeHomeostasisCoordinator';

const equilibriumEvolution: { at: string; score: number }[] = [];

export function resetRuntimeEquilibriumEvolutionCoordinatorForTest(): void {
  equilibriumEvolution.length = 0;
}

export function noteEquilibriumEvolution(input: RuntimeHomeostasisObserveInput): void {
  const score = scoreRuntimeHomeostasis(input);
  equilibriumEvolution.push({ at: new Date().toISOString(), score });
  if (equilibriumEvolution.length > 64) equilibriumEvolution.shift();
}

export function getEquilibriumEvolution(): { at: string; score: number }[] {
  if (equilibriumEvolution.length > 0) return [...equilibriumEvolution];
  return getHomeostasisHistory();
}

export function scoreEquilibriumEvolutionConfidence(input: RuntimeHomeostasisObserveInput): number {
  const history = getEquilibriumEvolution();
  if (history.length < 2) return 0.7;
  const recent = history.slice(-5).map((h) => h.score);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length;
  return Math.round(Math.max(0, Math.min(1, mean * (1 - variance * 2))) * 1000) / 1000;
}
