import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetTradingContinuitySafetyMonitorForTest(): void {
  /* stateless */
}

export function scoreTradingContinuityRisk(input: TradingSafetyObserveInput): number {
  let risk = input.staleHydrationRisk * 0.35;
  if (input.hydrationOverlapCount > 0) risk += 0.2 * input.hydrationOverlapCount;
  if (input.continuityScore < 75) risk += 0.15;
  if (input.recoverySuccessRate < 0.7) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function isContinuityProtectionActive(input: TradingSafetyObserveInput): boolean {
  return input.hydrationOverlapCount > 0 || input.staleHydrationRisk > 0.35;
}
