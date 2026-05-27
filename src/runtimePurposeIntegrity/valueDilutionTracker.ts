import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetValueDilutionTrackerForTest(): void {
  /* stateless */
}

export function scoreValueDilutionRisk(input: RuntimePurposeIntegrityObserveInput): number {
  let risk = 0;
  if (input.survivabilityEffectiveness > 0.65 && input.continuityScore < 78) risk += 0.22;
  if (input.runtimeAuditCoverage > 0.7 && input.simplificationIntegrity < 0.55) risk += 0.2;
  if (input.observerOverheadRatio > 0.45 && input.runtimeSafeTradingScore < 75) risk += 0.18;
  if (input.interventionDensity > 0.42 && input.objectiveAlignmentScore < 0.62) risk += 0.18;
  if (input.orchestrationEdgeCount > 18 && input.continuityScore < 80) risk += 0.12;
  risk += Math.max(0, input.runtimeComplexityScore - input.simplificationIntegrity) * 0.25;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
