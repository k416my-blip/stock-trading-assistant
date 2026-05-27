import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

const evolution: { at: string; enduranceScore: number }[] = [];

export function resetSelfRecursionEnduranceEvolutionCoordinatorForTest(): void {
  evolution.length = 0;
}

export function recordSelfRecursionEnduranceEvolution(
  input: RuntimeSelfRecursionEnduranceObserveInput,
  enduranceScore: number,
): number {
  const rounded = Math.round(enduranceScore * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), enduranceScore: rounded });
  if (evolution.length > 64) evolution.shift();
  void input;
  return rounded;
}

export function getSelfRecursionEnduranceEvolution(): { at: string; enduranceScore: number }[] {
  return [...evolution];
}
