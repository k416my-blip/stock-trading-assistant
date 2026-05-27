import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import { scoreBeliefVariance } from './runtimeEpistemicEvolutionCoordinator';

export function resetBeliefVarianceAnalyzerForTest(): void {
  /* stateless */
}

export function analyzeBeliefVariance(input: RuntimeEpistemicIntegrityObserveInput): number {
  return scoreBeliefVariance(input);
}
