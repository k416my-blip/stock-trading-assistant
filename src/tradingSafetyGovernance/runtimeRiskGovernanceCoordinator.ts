import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetRuntimeRiskGovernanceCoordinatorForTest(): void {
  /* stateless */
}

export function computeRuntimeTradingRisk(input: TradingSafetyObserveInput): number {
  let risk = 0.1;
  risk += (1 - input.runtimeSafeTradingScore / 100) * 0.25;
  risk += (1 - input.recoverySuccessRate) * 0.2;
  risk += Math.min(0.15, input.bridgeTrafficRate / 25);
  risk += input.observerOverheadRatio * 0.15;
  if (input.miuiAggressiveReclaim) risk += 0.1;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
