import type { TradingSafetyMode, TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';
import { TRADING_SAFETY_LOW_MEMORY_PCT } from '../constants/tradingSafetyGovernance';

export function resetLowMemoryTradingSafetyModeForTest(): void {
  /* stateless */
}

export function isLowMemorySafetyMode(input: TradingSafetyObserveInput): boolean {
  return input.memoryTrendPct >= TRADING_SAFETY_LOW_MEMORY_PCT || input.jsHeapMb > 175;
}

export function resolveLowMemorySafetyMode(input: TradingSafetyObserveInput): TradingSafetyMode | null {
  return isLowMemorySafetyMode(input) ? 'degraded_confidence' : null;
}
