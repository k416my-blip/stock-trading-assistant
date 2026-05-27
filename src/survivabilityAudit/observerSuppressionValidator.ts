import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetObserverSuppressionValidatorForTest(): void {
  /* stateless */
}

export function scoreObserverSuppressionLoss(input: SurvivabilityAuditObserveInput): number {
  let loss = input.runtimeTradingSuppression * 0.4;
  loss += input.loadSheddingSeverity * 0.35;
  if (input.observerOverheadRatio < 0.15 && input.runtimeTradingSuppression > 0.4) loss += 0.15;
  return Math.round(Math.max(0, Math.min(1, loss)) * 1000) / 1000;
}

export function isSuppressionExcessive(input: SurvivabilityAuditObserveInput, blindSpotRisk: number): boolean {
  return scoreObserverSuppressionLoss(input) > 0.55 && blindSpotRisk > 0.35;
}
