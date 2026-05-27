import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetObserverDependencyLockDetectorForTest(): void {
  /* stateless */
}

export function scoreObserverDependencyLock(input: RuntimeObserverRecursionObserveInput): number {
  let risk = 0;
  if (input.observerDensityScore > 0.5 && input.runtimeAuditCoverage > 0.75) risk += 0.32;
  if (input.governanceMode !== 'full_observe' && input.observerOverheadRatio > 0.35) risk += 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
