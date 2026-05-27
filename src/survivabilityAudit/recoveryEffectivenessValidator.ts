import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetRecoveryEffectivenessValidatorForTest(): void {
  /* stateless */
}

export function scoreRecoveryValidation(input: SurvivabilityAuditObserveInput): number {
  let score = input.recoverySuccessRate * 0.5;
  score += (input.continuityScore / 100) * 0.3;
  score += (input.jsSurvivalScore / 100) * 0.2;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
