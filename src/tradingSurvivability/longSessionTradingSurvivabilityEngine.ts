import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';
import { TRADING_SURVIVABILITY_LONG_SESSION_MIN } from '../constants/tradingSurvivabilityOrchestration';
import { computeRuntimeTradingFatigue } from './aiConciergeFatigueController';
import { computeWebsocketPressure } from './runtimeAwareWebsocketPacing';
import { scoreTradingHydrationStability } from './tradingHydrationContinuity';

export function resetLongSessionTradingSurvivabilityEngineForTest(): void {
  /* stateless */
}

export function isLongSessionTrading(input: TradingSurvivabilityObserveInput): boolean {
  return input.sessionMinutes >= TRADING_SURVIVABILITY_LONG_SESSION_MIN;
}

export function scoreLongSessionAdaptation(input: TradingSurvivabilityObserveInput): number {
  if (!isLongSessionTrading(input)) return 0.85;
  const fatigue = computeRuntimeTradingFatigue(input);
  const ws = computeWebsocketPressure(input);
  const hydration = scoreTradingHydrationStability(input);
  const score = 0.9 - fatigue * 0.25 - ws * 0.15 + hydration * 0.1;
  return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
}
