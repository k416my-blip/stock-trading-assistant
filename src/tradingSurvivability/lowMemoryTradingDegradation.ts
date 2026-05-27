import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';
import { TRADING_SURVIVABILITY_LOW_MEMORY_PCT } from '../constants/tradingSurvivabilityOrchestration';

export function resetLowMemoryTradingDegradationForTest(): void {
  /* stateless */
}

export function isLowMemoryTradingDegraded(input: TradingSurvivabilityObserveInput): boolean {
  return input.memoryTrendPct >= TRADING_SURVIVABILITY_LOW_MEMORY_PCT || input.jsHeapMb > 180;
}

export function scoreHeavyAnalysisPressure(input: TradingSurvivabilityObserveInput): number {
  let pressure = 0.1;
  if (isLowMemoryTradingDegraded(input)) pressure += 0.35;
  pressure += input.renderStormRisk * 0.3;
  if (input.renderBurstRate > 8) pressure += 0.15;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}
