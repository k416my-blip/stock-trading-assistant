import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetEcosystemPersistenceTrackerForTest(): void {
  /* stateless */
}

export function scoreEcosystemPersistenceIndex(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  return Math.round(
    ((input.recoverySuccessRate + input.continuityScore / 100 + input.jsSurvivalScore / 100) / 3) *
      1000,
  ) / 1000;
}
