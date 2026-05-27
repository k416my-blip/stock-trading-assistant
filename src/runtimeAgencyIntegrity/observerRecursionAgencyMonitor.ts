import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { scoreObserverRecursionAgency } from './runtimeAgencyEvolutionCoordinator';

export function resetObserverRecursionAgencyMonitorForTest(): void {
  /* stateless */
}

export function monitorObserverRecursionAgency(input: RuntimeAgencyIntegrityObserveInput): number {
  return scoreObserverRecursionAgency(input);
}
