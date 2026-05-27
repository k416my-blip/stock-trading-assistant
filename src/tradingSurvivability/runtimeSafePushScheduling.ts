import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

export function resetRuntimeSafePushSchedulingForTest(): void {
  /* stateless */
}

export function computeNotificationPressure(input: TradingSurvivabilityObserveInput): number {
  let pressure = 0.15;
  if (input.screenOff) pressure += 0.25;
  if (!input.appForeground) pressure += 0.2;
  if (input.batterySaver) pressure += 0.15;
  if (input.miuiAggressiveReclaim) pressure += 0.2;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}

export function shouldDeferNonCriticalPush(input: TradingSurvivabilityObserveInput): boolean {
  return computeNotificationPressure(input) > 0.45;
}
