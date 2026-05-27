import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetIntrospectionDependencyTrackerForTest(): void {
  /* stateless */
}

export function trackIntrospectionDependency(input: RuntimeMetaCognitionObserveInput): number {
  return Math.round(
    (input.observerOverheadRatio * 0.4 +
      input.runtimeAuditCoverage * 0.3 +
      (1 - input.runtimeRealityIntegrityScore) * 0.3) *
      1000,
  ) / 1000;
}
