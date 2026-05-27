import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetRuntimeSafeNotificationPacingForTest(): void {
  /* stateless */
}

export function notificationPacingMultiplier(input: TradingSafetyObserveInput): number {
  let mult = 1;
  if (input.screenOff) mult += 0.8;
  if (!input.appForeground) mult += 0.5;
  if (input.batterySaver) mult += 0.4;
  if (input.miuiAggressiveReclaim) mult += 0.35;
  return Math.round(mult * 100) / 100;
}

export function criticalAlertsOnly(input: TradingSafetyObserveInput): boolean {
  return input.screenOff || input.batterySaver || input.miuiAggressiveReclaim;
}
