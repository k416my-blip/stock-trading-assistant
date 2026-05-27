import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetRecursionDepthAnalyzerForTest(): void {
  /* stateless */
}

export function scoreRecursionDepth(input: RuntimeObserverRecursionObserveInput): number {
  return Math.round(
    Math.min(
      1,
      input.observerDensityScore * 0.35 +
        input.runtimeAuditCoverage * 0.3 +
        input.metaRecursionRisk * 0.35,
    ) * 1000,
  ) / 1000;
}
