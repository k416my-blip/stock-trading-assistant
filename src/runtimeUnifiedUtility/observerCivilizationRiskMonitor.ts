import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetObserverCivilizationRiskMonitorForTest(): void {
  /* stateless */
}

export function scoreObserverCivilizationRisk(input: RuntimeUnifiedUtilityObserveInput): number {
  let risk = 0;
  if (input.observerOverheadRatio > 0.48) risk += 0.28;
  if (input.observerDensityScore > 0.52 && input.runtimeAuditCoverage > 0.7) risk += 0.25;
  if (input.telemetryAmplificationScore > 0.42 && input.simplificationIntegrity < 0.55) risk += 0.22;
  if (input.runtimeAmplificationRisk > 0.38) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
