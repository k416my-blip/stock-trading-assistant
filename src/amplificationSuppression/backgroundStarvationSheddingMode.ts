import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetBackgroundStarvationSheddingModeForTest(): void {
  /* stateless */
}

export function isBackgroundStarvationShedding(input: AmplificationSuppressionObserveInput): boolean {
  return (
    input.miuiAggressiveReclaim &&
    (!input.appForeground || input.screenOff || input.batterySaver)
  );
}

export function backgroundSheddingActions(input: AmplificationSuppressionObserveInput): string[] {
  if (!isBackgroundStarvationShedding(input)) return [];
  return ['observer_shedding', 'lightweight_telemetry', 'screen_off_minimal', 'critical_continuity_only'];
}
