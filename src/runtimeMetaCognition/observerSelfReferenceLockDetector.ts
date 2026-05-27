import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetObserverSelfReferenceLockDetectorForTest(): void {
  /* stateless */
}

export function scoreObserverSelfReferenceLockRisk(input: RuntimeMetaCognitionObserveInput): number {
  let risk = 0;
  if (input.observerOverheadRatio > 0.45 && input.runtimeAuditCoverage > 0.75) risk += 0.28;
  if (input.observerDensityScore > 0.52 && input.observerConfirmationLoopRisk > 0.35) risk += 0.25;
  if (input.metaRecursionRisk > 0.45 && input.telemetryAmplificationScore > 0.45) risk += 0.2;
  if (input.observerAgencyFusionRisk > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
