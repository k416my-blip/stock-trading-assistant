import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function resetBatteryAwareMarketObservationForTest(): void {
  /* stateless */
}

export function shouldUseLightweightPolling(input: TradingSurvivabilityObserveInput): boolean {
  return input.batterySaver || input.screenOff || !input.appForeground;
}

export function batteryPollingMultiplier(input: TradingSurvivabilityObserveInput): number {
  if (!input.batterySaver) return 1;
  return input.screenOff ? 2.5 : 1.8;
}
