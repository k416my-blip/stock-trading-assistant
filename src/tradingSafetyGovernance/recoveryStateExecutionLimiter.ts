import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetRecoveryStateExecutionLimiterForTest(): void {
  /* stateless */
}

export function isRecoveryStateLimited(input: TradingSafetyObserveInput): boolean {
  return input.recoverySuccessRate < 0.65 || input.continuityScore < 70;
}

export function recoveryExecutionLimitMultiplier(input: TradingSafetyObserveInput): number {
  if (!isRecoveryStateLimited(input)) return 1;
  return 1.6 + (1 - input.recoverySuccessRate) * 0.8;
}
