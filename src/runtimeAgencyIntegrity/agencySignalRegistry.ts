import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { detectAutonomyDriftSignals } from './longSessionAutonomyDriftEngine';

export function resetAgencySignalRegistryForTest(): void {
  /* stateless */
}

export function registerAgencySignals(input: RuntimeAgencyIntegrityObserveInput): string[] {
  return detectAutonomyDriftSignals(input);
}
