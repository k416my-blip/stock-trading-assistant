import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

export function resetSelfPreservationDriftDetectorForTest(): void {
  /* stateless */
}

export function scoreSelfPreservationDriftRisk(input: RuntimeSelfLimitationObserveInput): number {
  let drift = 0;
  if (input.runtimeAuditCoverage > 0.7 && input.runtimeHomeostasisScore > 0.72) drift += 0.2;
  if (input.interventionDensity > 0.45 && input.equilibriumPersistence > 0.68) drift += 0.22;
  if (input.observerOverheadRatio > 0.48 && input.simplificationIntegrity < 0.55) drift += 0.2;
  if (input.recoverySuccessRate > 0.7 && input.recursiveStabilizationRisk > 0.38) drift += 0.18;
  if (input.sessionMinutes >= 120) drift += 0.1;
  return Math.round(Math.min(1, drift) * 1000) / 1000;
}
