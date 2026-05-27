import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetIntrospectionDependencyMonitorForTest(): void {
  /* stateless */
}

export function scoreRuntimeIntrospectionDependencyRisk(
  input: RuntimeMetaCognitionObserveInput,
): number {
  let risk = 0;
  if (input.observerOverheadRatio > 0.42 && input.runtimeRealityDistortionRisk > 0.35) risk += 0.26;
  if (input.runtimeAuditCoverage > 0.78 && input.continuityScore < 70) risk += 0.22;
  if (input.telemetryAmplificationScore > 0.48 && input.runtimeRealityIntegrityScore < 0.55) {
    risk += 0.2;
  }
  if (input.observerConfirmationLoopRisk > 0.38) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
