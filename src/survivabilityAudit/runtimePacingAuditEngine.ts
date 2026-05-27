import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetRuntimePacingAuditEngineForTest(): void {
  /* stateless */
}

export function scorePacingIntegrity(input: SurvivabilityAuditObserveInput): number {
  let integrity = 0.85;
  if (input.runtimeEntropyScore > 0.55) integrity -= 0.15;
  if (input.loadSheddingSeverity > 0.6) integrity -= 0.1;
  if (input.eventLoopLagMs > 350) integrity -= 0.12;
  if (input.runtimeEquilibriumStability > 0.6) integrity += 0.05;
  return Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
}
