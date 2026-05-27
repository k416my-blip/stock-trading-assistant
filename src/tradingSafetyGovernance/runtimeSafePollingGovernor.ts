import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetRuntimeSafePollingGovernorForTest(): void {
  /* stateless */
}

export function pollingIntervalMultiplier(input: TradingSafetyObserveInput): number {
  let mult = 1;
  if (input.batterySaver) mult += 0.6;
  if (input.screenOff) mult += 0.9;
  if (input.thermalState !== 'none' && input.thermalState !== 'light') mult += 0.5;
  if (input.miuiAggressiveReclaim) mult += 0.4;
  if (input.observerOverheadRatio > 0.55) mult += 0.35;
  return Math.round(mult * 100) / 100;
}

export function shouldThrottleHighFrequencyPolling(input: TradingSafetyObserveInput): boolean {
  return pollingIntervalMultiplier(input) > 1.8;
}
