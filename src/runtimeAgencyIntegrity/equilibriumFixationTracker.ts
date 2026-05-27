import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { scoreEquilibriumFixation } from './runtimeAgencyEvolutionCoordinator';

export function resetEquilibriumFixationTrackerForTest(): void {
  /* stateless */
}

export function trackEquilibriumFixation(input: RuntimeAgencyIntegrityObserveInput): number {
  return scoreEquilibriumFixation(input);
}
