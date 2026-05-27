import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetRuntimeInstabilityRiskDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeInstabilityRisk(input: TradingSafetyObserveInput): number {
  let risk = 0;
  if (input.eventLoopLagMs > 300) risk += 0.2;
  if (input.bridgeTrafficRate > 8) risk += 0.18;
  if (input.renderStormRisk > 0.5) risk += 0.15;
  if (input.memoryTrendPct > 70) risk += 0.12;
  if (input.jsSurvivalScore < 65) risk += 0.1;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
