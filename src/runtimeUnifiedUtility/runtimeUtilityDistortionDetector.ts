import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetRuntimeUtilityDistortionDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeUtilityDistortion(input: RuntimeUnifiedUtilityObserveInput): number {
  let distortion = 0;
  if (input.observerDensityScore > 0.5 && input.continuityScore > 78) distortion += 0.25;
  if (input.observerOverheadRatio > 0.45 && input.runtimeUtilityIntegrity > 0.7) distortion += 0.22;
  if (input.telemetryAmplificationScore > 0.4 && input.eventLoopLagMs > 280) distortion += 0.2;
  if (input.runtimeAuditCoverage > 0.72 && input.simplificationIntegrity < 0.55) distortion += 0.18;
  return Math.round(Math.min(1, distortion) * 1000) / 1000;
}
