import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function resetTradingHydrationContinuityForTest(): void {
  /* stateless */
}

export function scoreTradingHydrationStability(input: TradingSurvivabilityObserveInput): number {
  let stability = 1;
  stability -= input.staleHydrationRisk * 0.4;
  if (input.hydrationOverlapCount > 1) stability -= 0.15 * input.hydrationOverlapCount;
  if (input.continuityScore < 70) stability -= 0.12;
  return Math.round(Math.max(0, Math.min(1, stability)) * 1000) / 1000;
}

export function shouldPaceTradingHydration(input: TradingSurvivabilityObserveInput): boolean {
  return input.hydrationOverlapCount > 0 || input.staleHydrationRisk > 0.35;
}
