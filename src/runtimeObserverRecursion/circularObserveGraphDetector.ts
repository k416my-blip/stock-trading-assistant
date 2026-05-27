import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetCircularObserveGraphDetectorForTest(): void {
  /* stateless */
}

export function scoreCircularObserveGraph(input: RuntimeObserverRecursionObserveInput): number {
  return Math.round(
    Math.min(1, input.orchestrationEdgeCount / 28 + input.observerDensityScore * 0.35) * 1000,
  ) / 1000;
}
