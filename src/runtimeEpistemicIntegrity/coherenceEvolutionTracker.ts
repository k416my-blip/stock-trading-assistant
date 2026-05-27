import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import { scoreCoherenceEvolution } from './runtimeEpistemicEvolutionCoordinator';

export function resetCoherenceEvolutionTrackerForTest(): void {
  /* stateless */
}

export function trackCoherenceEvolution(input: RuntimeEpistemicIntegrityObserveInput): number {
  return scoreCoherenceEvolution(input);
}
