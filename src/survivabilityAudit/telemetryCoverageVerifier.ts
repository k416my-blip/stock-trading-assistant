import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetTelemetryCoverageVerifierForTest(): void {
  /* stateless */
}

export function scoreTelemetryCoverageIntegrity(input: SurvivabilityAuditObserveInput): number {
  let integrity = 0.9;
  if (input.loadSheddingSeverity > 0.5) integrity -= 0.2;
  if (input.observerOverheadRatio < 0.12) integrity -= 0.15;
  if (input.runtimeTradingSuppression > 0.55) integrity -= 0.12;
  if (input.staleHydrationRisk > 0.3) integrity -= 0.1;
  return Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
}
