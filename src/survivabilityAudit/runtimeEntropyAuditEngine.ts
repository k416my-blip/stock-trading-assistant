import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetRuntimeEntropyAuditEngineForTest(): void {
  /* stateless */
}

export function auditEntropyIntegrity(input: SurvivabilityAuditObserveInput): number {
  return Math.round((1 - Math.min(1, input.runtimeEntropyScore)) * 1000) / 1000;
}
