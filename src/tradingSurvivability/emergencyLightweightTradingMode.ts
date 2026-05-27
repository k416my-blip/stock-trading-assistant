import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';
import { TRADING_SURVIVABILITY_EMERGENCY_HEALTH } from '../constants/tradingSurvivabilityOrchestration';
import { computeTradingRuntimeHealth } from './runtimeAwareTradingCoordinator';

export function resetEmergencyLightweightTradingModeForTest(): void {
  /* stateless */
}

export function scoreEmergencyLightweight(input: TradingSurvivabilityObserveInput): number {
  const health = computeTradingRuntimeHealth(input);
  if (health >= TRADING_SURVIVABILITY_EMERGENCY_HEALTH + 20) return 0;
  if (health >= TRADING_SURVIVABILITY_EMERGENCY_HEALTH) {
    const partial =
      (TRADING_SURVIVABILITY_EMERGENCY_HEALTH + 20 - health) / 20;
    return Math.round(Math.min(1, partial) * 1000) / 1000;
  }
  const deficit = TRADING_SURVIVABILITY_EMERGENCY_HEALTH - health;
  return Math.round(Math.min(1, 0.5 + deficit / TRADING_SURVIVABILITY_EMERGENCY_HEALTH) * 1000) / 1000;
}

export function isEmergencyLightweightActive(input: TradingSurvivabilityObserveInput): boolean {
  return scoreEmergencyLightweight(input) > 0.35;
}

export const EMERGENCY_LIGHTWEIGHT_FEATURES = [
  'holdings',
  'prices',
  'critical_alerts',
  'manual_trade_path',
] as const;
