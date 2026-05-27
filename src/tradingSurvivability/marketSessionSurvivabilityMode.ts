import type {
  SurvivabilityTradingMode,
  TradingSurvivabilityObserveInput,
} from '../types/tradingSurvivabilityOrchestration';
import { computeTradingRuntimeHealth } from './runtimeAwareTradingCoordinator';
import { isLowMemoryTradingDegraded } from './lowMemoryTradingDegradation';
import { TRADING_SURVIVABILITY_EMERGENCY_HEALTH, TRADING_SURVIVABILITY_LONG_SESSION_MIN, TRADING_SURVIVABILITY_THERMAL_SEVERE } from '../constants/tradingSurvivabilityOrchestration';

export function resetMarketSessionSurvivabilityModeForTest(): void {
  /* stateless */
}

export function resolveSurvivabilityTradingMode(
  input: TradingSurvivabilityObserveInput,
): SurvivabilityTradingMode {
  const health = computeTradingRuntimeHealth(input);
  if (health < TRADING_SURVIVABILITY_EMERGENCY_HEALTH) return 'emergency_lightweight';
  if (TRADING_SURVIVABILITY_THERMAL_SEVERE.includes(input.thermalState)) return 'thermal_lightweight';
  if (isLowMemoryTradingDegraded(input)) return 'low_memory_core';
  if (input.screenOff || !input.appForeground) return 'screen_off_minimal';
  if (input.miuiAggressiveReclaim) return 'reclaim_adapted_trading';
  if (input.sessionMinutes >= TRADING_SURVIVABILITY_LONG_SESSION_MIN) return 'long_session_survivability';
  if (input.bridgeTrafficRate > 9) return 'bridge_paced_concierge';
  if (input.batterySaver || input.thermalState === 'moderate') return 'paced_polling';
  return 'full_trading';
}
