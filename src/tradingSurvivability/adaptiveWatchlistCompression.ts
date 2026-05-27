import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function resetAdaptiveWatchlistCompressionForTest(): void {
  /* stateless */
}

export function watchlistCompressionRatio(input: TradingSurvivabilityObserveInput): number {
  if (input.memoryTrendPct > 80) return 0.35;
  if (input.memoryTrendPct > 65) return 0.55;
  if (input.jsHeapMb > 170) return 0.6;
  return 1;
}

export function essentialSymbolsOnly(input: TradingSurvivabilityObserveInput): boolean {
  return watchlistCompressionRatio(input) < 0.7;
}
