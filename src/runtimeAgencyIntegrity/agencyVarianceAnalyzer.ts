import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { scoreAgencyVariance } from './runtimeAgencyEvolutionCoordinator';

export function resetAgencyVarianceAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeAgencyVariance(input: RuntimeAgencyIntegrityObserveInput): number {
  return scoreAgencyVariance(input);
}
