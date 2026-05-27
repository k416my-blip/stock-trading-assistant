import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';
import { TRADING_SURVIVABILITY_EMERGENCY_HEALTH } from '../constants/tradingSurvivabilityOrchestration';
import { computeTradingRuntimeHealth } from './runtimeAwareTradingCoordinator';

export function resetRuntimeHealthTradingGateForTest(): void {
  /* stateless */
}

export function isTradingGateOpen(input: TradingSurvivabilityObserveInput): boolean {
  return computeTradingRuntimeHealth(input) >= TRADING_SURVIVABILITY_EMERGENCY_HEALTH;
}

export function scoreRuntimeExecutionSafety(input: TradingSurvivabilityObserveInput): number {
  const health = computeTradingRuntimeHealth(input);
  let safety = health / 100;
  if (input.hydrationOverlapCount > 2) safety -= 0.12;
  if (input.heartbeatAgeMs > 8000) safety -= 0.08;
  return Math.round(Math.max(0, Math.min(1, safety)) * 1000) / 1000;
}
