import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function resetAiConciergeFatigueControllerForTest(): void {
  /* stateless */
}

export function computeRuntimeTradingFatigue(input: TradingSurvivabilityObserveInput): number {
  let fatigue = input.runtimeFatigue;
  if (input.sessionMinutes > 90) fatigue += 0.12;
  if (input.sessionMinutes > 150) fatigue += 0.15;
  if (input.eventLoopLagMs > 300) fatigue += 0.08;
  return Math.round(Math.min(1, fatigue) * 1000) / 1000;
}

export function shouldReduceConciergeFrequency(input: TradingSurvivabilityObserveInput): boolean {
  return computeRuntimeTradingFatigue(input) > 0.5;
}
