import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

const inflationTimeline: { at: string; inflation: number }[] = [];

export function resetGovernanceInflationTrackerForTest(): void {
  inflationTimeline.length = 0;
}

export function scoreRuntimeGovernanceInflationRisk(input: RuntimeUnifiedUtilityObserveInput): number {
  let risk = 0;
  if (input.governanceConfidence > 0.78 && input.simplificationIntegrity < 0.55) risk += 0.22;
  if (input.runtimeAuditCoverage > 0.72) risk += 0.2;
  if (input.orchestrationEdgeCount > 16 && input.metaCoordinationStability > 0.7) risk += 0.2;
  if (input.metaRecursionRisk > 0.45) risk += 0.18;
  if (input.interventionDensity > 0.42) risk += 0.12;
  const rounded = Math.round(Math.min(1, risk) * 1000) / 1000;
  inflationTimeline.push({ at: new Date().toISOString(), inflation: rounded });
  if (inflationTimeline.length > 64) inflationTimeline.shift();
  return rounded;
}

export function getGovernanceInflationTimeline(): { at: string; inflation: number }[] {
  return [...inflationTimeline];
}
