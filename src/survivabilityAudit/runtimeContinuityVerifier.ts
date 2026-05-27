import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetRuntimeContinuityVerifierForTest(): void {
  /* stateless */
}

export function scoreContinuityVerification(input: SurvivabilityAuditObserveInput): number {
  let score = input.continuityScore / 100;
  score += (1 - input.staleHydrationRisk) * 0.2;
  if (input.hydrationOverlapCount === 0) score += 0.05;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
