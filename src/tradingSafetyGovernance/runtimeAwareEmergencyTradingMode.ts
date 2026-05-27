import type { TradingSafetyMode, TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';
import { TRADING_SAFETY_EMERGENCY_RISK } from '../constants/tradingSafetyGovernance';
import { EMERGENCY_LIGHTWEIGHT_FEATURES, EMERGENCY_SUPPRESSED_FEATURES } from '../constants/tradingSafetyGovernance';

export function resetRuntimeAwareEmergencyTradingModeForTest(): void {
  /* stateless */
}

export function isEmergencyLightweightTrading(emergencyRisk: number): boolean {
  return emergencyRisk >= TRADING_SAFETY_EMERGENCY_RISK;
}

export function resolveEmergencyMode(
  input: TradingSafetyObserveInput,
  emergencyRisk: number,
): TradingSafetyMode | null {
  if (!isEmergencyLightweightTrading(emergencyRisk)) return null;
  return 'emergency_lightweight_trading';
}

export function getEmergencyMaintainedFeatures(): readonly string[] {
  return EMERGENCY_LIGHTWEIGHT_FEATURES;
}

export function getEmergencySuppressedFeatures(): readonly string[] {
  return EMERGENCY_SUPPRESSED_FEATURES;
}
