import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetStorylineRecursionTrackerForTest(): void {
  /* stateless */
}

export function trackStorylineRecursion(input: RuntimeNarrativeIntegrityObserveInput): number {
  return Math.round(
    (input.runtimeAuditCoverage * 0.4 + input.recursiveBeliefReinforcementRisk * 0.35 + input.metaRecursionRisk * 0.25) *
      1000,
  ) / 1000;
}
