import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetObserverPurposeImbalanceDetectorForTest(): void {
  /* stateless */
}

export function scoreObserverPurposeBalance(input: RuntimePurposeIntegrityObserveInput): number {
  const purposeContribution = (input.continuityScore / 100) * 0.4 + input.survivabilityEffectiveness * 0.3;
  const observerCost = input.observerOverheadRatio * 0.3 + input.observerDensityScore * 0.2;
  return Math.round(Math.max(0, Math.min(1, purposeContribution - observerCost + 0.5)) * 1000) / 1000;
}

export function scoreObserverOverPersistenceRisk(input: RuntimePurposeIntegrityObserveInput): number {
  let risk = 0;
  if (input.observerOverheadRatio > 0.45 && input.runtimeAuditCoverage > 0.7) risk += 0.28;
  if (input.observerDensityScore > 0.5 && input.simplificationIntegrity < 0.55) risk += 0.25;
  if (input.telemetryAmplificationScore > 0.4 && input.continuityScore < 80) risk += 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
