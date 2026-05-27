import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetRuntimeObservabilityIntegrityCheckerForTest(): void {
  /* stateless */
}

export function scoreObservabilityIntegrity(input: SurvivabilityAuditObserveInput): number {
  let integrity = 0.88;
  if (input.observerOverheadRatio < 0.1) integrity -= 0.15;
  if (input.loadSheddingSeverity > 0.55) integrity -= 0.12;
  if (input.staleHydrationRisk > 0.35) integrity -= 0.1;
  return Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
}
