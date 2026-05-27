import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';
import { computeNotificationPressure } from './runtimeSafePushScheduling';

export function resetRuntimeAwareNotificationPacingForTest(): void {
  /* stateless */
}

export function notificationPacingMultiplier(input: TradingSurvivabilityObserveInput): number {
  const pressure = computeNotificationPressure(input);
  return 1 + pressure * 1.5;
}

export function criticalAlertsOnly(input: TradingSurvivabilityObserveInput): boolean {
  return computeNotificationPressure(input) > 0.6 || input.screenOff;
}
