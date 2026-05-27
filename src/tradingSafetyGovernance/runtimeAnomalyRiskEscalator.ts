import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetRuntimeAnomalyRiskEscalatorForTest(): void {
  /* stateless */
}

export function scoreEmergencyTradingRisk(
  tradingRisk: number,
  instabilityRisk: number,
  continuityRisk: number,
): number {
  const raw = tradingRisk * 0.45 + instabilityRisk * 0.35 + continuityRisk * 0.2;
  return Math.round(Math.min(1, raw) * 1000) / 1000;
}

export function shouldEscalateRisk(input: TradingSafetyObserveInput, emergencyRisk: number): boolean {
  return emergencyRisk > 0.55 || input.eventLoopLagMs > 500 || input.jsSurvivalScore < 50;
}
