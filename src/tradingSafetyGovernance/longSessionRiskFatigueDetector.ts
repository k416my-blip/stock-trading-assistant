import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';
import { TRADING_SAFETY_LONG_SESSION_MIN } from '../constants/tradingSafetyGovernance';

export function resetLongSessionRiskFatigueDetectorForTest(): void {
  /* stateless */
}

export function scoreLongSessionTradingFatigue(input: TradingSafetyObserveInput): number {
  if (input.sessionMinutes < TRADING_SAFETY_LONG_SESSION_MIN) return 0.1;
  let fatigue = 0.25;
  if (input.sessionMinutes > 150) fatigue += 0.2;
  fatigue += input.observerOverheadRatio * 0.2;
  fatigue += (1 - input.metaCoordinationStability) * 0.15;
  return Math.round(Math.min(1, fatigue) * 1000) / 1000;
}

export function isLongSessionFatigue(input: TradingSafetyObserveInput): boolean {
  return scoreLongSessionTradingFatigue(input) > 0.45;
}
