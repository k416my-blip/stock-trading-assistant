import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';
import { TRADING_SURVIVABILITY_THERMAL_SEVERE } from '../constants/tradingSurvivabilityOrchestration';

const pollingHistory: { at: string; cost: number }[] = [];

export function resetThermalAwareMarketPollingForTest(): void {
  pollingHistory.length = 0;
}

export function computeMarketPollingCost(input: TradingSurvivabilityObserveInput): number {
  let cost = 0.2;
  if (TRADING_SURVIVABILITY_THERMAL_SEVERE.includes(input.thermalState)) cost += 0.45;
  else if (input.thermalState === 'moderate') cost += 0.2;
  if (input.batterySaver) cost += 0.15;
  cost += Math.min(0.2, input.reconnectPerMin / 30);
  const rounded = Math.round(Math.min(1, cost) * 1000) / 1000;
  pollingHistory.push({ at: new Date().toISOString(), cost: rounded });
  if (pollingHistory.length > 120) pollingHistory.shift();
  return rounded;
}

export function shouldExtendPollingInterval(input: TradingSurvivabilityObserveInput): boolean {
  return TRADING_SURVIVABILITY_THERMAL_SEVERE.includes(input.thermalState) || input.batterySaver;
}

export function getMarketPollingHistory(): { at: string; cost: number }[] {
  return [...pollingHistory];
}
