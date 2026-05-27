import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetObserverCascadeTrackerForTest(): void {
  /* stateless */
}

export function trackObserverCascade(input: RuntimeObserverRecursionObserveInput): number {
  return Math.round(
    (input.observerDensityScore * 0.5 + input.runtimeAuditCoverage * 0.5) * 1000,
  ) / 1000;
}
