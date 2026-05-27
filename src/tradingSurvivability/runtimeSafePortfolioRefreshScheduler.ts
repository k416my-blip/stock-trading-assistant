import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

let lastRefreshCost = 0.25;

export function resetRuntimeSafePortfolioRefreshSchedulerForTest(): void {
  lastRefreshCost = 0.25;
}

export function computePortfolioRefreshCost(input: TradingSurvivabilityObserveInput): number {
  let cost = 0.25;
  if (input.eventLoopLagMs > 200) cost += 0.15;
  if (input.thermalState !== 'none' && input.thermalState !== 'light') cost += 0.2;
  if (input.screenOff) cost += 0.25;
  if (input.batterySaver) cost += 0.1;
  lastRefreshCost = Math.round(Math.min(1, cost) * 1000) / 1000;
  return lastRefreshCost;
}

export function getPortfolioRefreshIntervalMultiplier(input: TradingSurvivabilityObserveInput): number {
  return 1 + computePortfolioRefreshCost(input) * 2;
}
