import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

let persistenceStreak = 0;

export function resetInterventionPersistenceMonitorForTest(): void {
  persistenceStreak = 0;
}

export function noteInterventionPersistence(input: RuntimeSelfLimitationObserveInput): number {
  if (input.interventionDensity > 0.38) persistenceStreak += 1;
  else persistenceStreak = Math.max(0, persistenceStreak - 1);
  return Math.round(Math.min(1, persistenceStreak / 10) * 1000) / 1000;
}
