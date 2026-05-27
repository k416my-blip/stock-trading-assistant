import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';
import { detectCivilizationDriftSignals } from './longSessionCivilizationDriftEngine';

export function resetCivilizationSignalRegistryForTest(): void {
  /* stateless */
}

export function registerCivilizationSignals(
  input: RuntimeCivilizationalResilienceObserveInput,
): string[] {
  return detectCivilizationDriftSignals(input);
}
