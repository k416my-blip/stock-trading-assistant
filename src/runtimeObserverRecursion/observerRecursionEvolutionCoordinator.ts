import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

const evolution: { at: string; variance: number }[] = [];

export function resetObserverRecursionEvolutionCoordinatorForTest(): void {
  evolution.length = 0;
}

export function recordObserverRecursionEvolution(input: RuntimeObserverRecursionObserveInput): number {
  const v = input.metaRecursionRisk * 0.5 + input.observerDensityScore * 0.5;
  evolution.push({ at: new Date().toISOString(), variance: v });
  if (evolution.length > 64) evolution.shift();
  return Math.round(v * 1000) / 1000;
}

export function getObserverRecursionEvolution(): { at: string; variance: number }[] {
  return [...evolution];
}
