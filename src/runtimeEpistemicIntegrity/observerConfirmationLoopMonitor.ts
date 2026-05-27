import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';

export function resetObserverConfirmationLoopMonitorForTest(): void {
  /* stateless */
}

export function scoreObserverConfirmationLoopRisk(
  input: RuntimeEpistemicIntegrityObserveInput,
): number {
  let risk = 0;
  if (input.observerDensityScore > 0.48 && input.telemetryAmplificationScore > 0.38) risk += 0.28;
  if (input.observerOverheadRatio > 0.45 && input.runtimeAuditCoverage > 0.7) risk += 0.25;
  if (input.observerEcosystemInflationRisk > 0.35 && input.continuityScore > 78) risk += 0.2;
  if (input.observerCivilizationRisk > 0.4) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
