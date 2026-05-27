import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetExplanationRecursionMonitorForTest(): void {
  /* stateless */
}

export function monitorExplanationRecursion(input: RuntimeNarrativeIntegrityObserveInput): number {
  return Math.round(
    (input.runtimeAuditCoverage * 0.4 +
      input.recursiveAuditFixationRisk * 0.35 +
      input.metaRecursionRisk * 0.25) *
      1000,
  ) / 1000;
}
