import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetObserveGraphComplexityAnalyzerForTest(): void {
  /* stateless */
}

export function scoreObserveGraphComplexity(input: RuntimeObserverRecursionObserveInput): number {
  return Math.round(
    Math.min(
      1,
      input.orchestrationEdgeCount / 32 +
        input.observerDensityScore * 0.4 +
        input.runtimeAuditCoverage * 0.25,
    ) * 1000,
  ) / 1000;
}
