import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';

export function resetRecursiveInterventionPersistenceAnalyzerForTest(): void {
  /* stateless */
}

export function scoreRecursiveInterventionPersistenceRisk(
  input: RuntimeAgencyIntegrityObserveInput,
): number {
  let risk = input.interventionDensity * 0.3;
  if (input.runtimeTradingSuppression > 0.38 && input.equilibriumPersistence > 0.72) risk += 0.22;
  if (input.runtimeAuditCoverage > 0.72 && input.observerDensityScore > 0.48) risk += 0.22;
  if (input.interventionDensity > 0.4 && input.runtimeCalmnessIndex > 0.72) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
