import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { scoreGovernancePersistence } from './runtimeAgencyEvolutionCoordinator';

export function resetGovernancePersistenceAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeGovernancePersistence(input: RuntimeAgencyIntegrityObserveInput): number {
  return scoreGovernancePersistence(input);
}
