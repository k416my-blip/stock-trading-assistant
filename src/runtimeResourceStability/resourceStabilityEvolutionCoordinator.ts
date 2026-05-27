import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

const evolution: { at: string; score: number }[] = [];

export function resetResourceStabilityEvolutionCoordinatorForTest(): void {
  evolution.length = 0;
}

export function recordResourceEvolution(input: RuntimeResourceStabilityObserveInput): number {
  const score = input.jsHeapMb / 256 + input.eventLoopLagMs / 600;
  evolution.push({ at: new Date().toISOString(), score });
  if (evolution.length > 64) evolution.shift();
  return Math.round(Math.min(1, score) * 1000) / 1000;
}

export function getResourceEvolution(): { at: string; score: number }[] {
  return [...evolution];
}
