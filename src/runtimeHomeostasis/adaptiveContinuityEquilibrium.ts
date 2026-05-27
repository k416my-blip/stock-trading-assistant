import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetAdaptiveContinuityEquilibriumForTest(): void {
  /* stateless */
}

export function scoreContinuityEquilibrium(input: RuntimeHomeostasisObserveInput): number {
  let eq = (input.continuityScore / 100) * 0.4;
  eq += input.runtimeSafeTradingScore / 100 * 0.25;
  eq += (1 - input.staleHydrationRisk) * 0.2;
  eq += input.heartbeatAgeMs < 8000 ? 0.1 : 0;
  eq += input.recoverySuccessRate * 0.05;
  return Math.round(Math.max(0, Math.min(1, eq)) * 1000) / 1000;
}
