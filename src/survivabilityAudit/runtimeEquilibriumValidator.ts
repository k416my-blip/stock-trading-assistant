import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetRuntimeEquilibriumValidatorForTest(): void {
  /* stateless */
}

export function scoreRuntimeEquilibriumIntegrity(input: SurvivabilityAuditObserveInput): number {
  const balance = [
    input.recoverySuccessRate,
    input.governanceConfidence,
    1 - input.runtimeTradingSuppression,
    input.continuityScore / 100,
    1 - input.observerOverheadRatio,
    input.runtimeEquilibriumStability,
  ];
  const mean = balance.reduce((a, b) => a + b, 0) / balance.length;
  const spread = Math.max(...balance) - Math.min(...balance);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.5))) * 1000) / 1000;
}
