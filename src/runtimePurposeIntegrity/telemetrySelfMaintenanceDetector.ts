import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetTelemetrySelfMaintenanceDetectorForTest(): void {
  /* stateless */
}

export function scoreTelemetrySelfMaintenanceRisk(input: RuntimePurposeIntegrityObserveInput): number {
  let risk = 0;
  if (input.telemetryAmplificationScore > 0.4 && input.continuityScore < 80) risk += 0.25;
  if (input.observerOverheadRatio > 0.45 && input.telemetryAmplificationScore > 0.35) risk += 0.22;
  if (input.runtimeAmplificationRisk > 0.35 && input.simplificationIntegrity < 0.55) risk += 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
