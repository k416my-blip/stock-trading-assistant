import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';
import { TRADING_SAFETY_THERMAL_SEVERE } from '../constants/tradingSafetyGovernance';

export function resetThermalRiskAwareExecutionPacingForTest(): void {
  /* stateless */
}

export function scoreThermalTradingPressure(input: TradingSafetyObserveInput): number {
  if (TRADING_SAFETY_THERMAL_SEVERE.includes(input.thermalState)) return 0.9;
  if (input.thermalState === 'moderate') return 0.55;
  if (input.thermalState === 'light') return 0.25;
  if (input.batterySaver && input.renderFps < 14) return 0.3;
  return 0.08;
}

export function thermalExecutionPacingMultiplier(input: TradingSafetyObserveInput): number {
  return 1 + scoreThermalTradingPressure(input) * 1.8;
}
