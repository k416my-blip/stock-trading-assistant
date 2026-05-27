import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimeObserverRecursionCoordinatorForTest(): void {
  evolution.length = 0;
}

export function scoreObserverRecursionFlow(input: RuntimeObserverRecursionObserveInput): number {
  const score =
    (1 - input.observerOverheadRatio) * 0.35 +
    (1 - input.telemetryAmplificationScore) * 0.35 +
    (1 - input.observerDensityScore) * 0.3;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getRecursionEvolution(): { at: string; score: number }[] {
  return [...evolution];
}
