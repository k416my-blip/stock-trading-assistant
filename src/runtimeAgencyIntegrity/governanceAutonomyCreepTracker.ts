import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';

export function resetGovernanceAutonomyCreepTrackerForTest(): void {
  /* stateless */
}

export function scoreRuntimeGovernanceAutonomyRisk(input: RuntimeAgencyIntegrityObserveInput): number {
  let risk = 0;
  if (input.governanceConfidence > 0.78 && input.runtimeGovernanceInflationRisk > 0.35) risk += 0.28;
  if (input.runtimeEpistemologyInflationRisk > 0.35 && input.interventionDensity > 0.38) risk += 0.22;
  if (input.recursiveGovernanceEcologyRisk > 0.35 && input.sessionMinutes > 90) risk += 0.2;
  if (input.metaRecursionRisk > 0.45 && input.governanceConfidence > 0.72) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
