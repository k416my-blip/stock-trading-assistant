import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import { scoreWorldviewDiversity } from './runtimeEpistemicEvolutionCoordinator';

export function resetWorldviewDiversityScorerForTest(): void {
  /* stateless */
}

export function scoreWorldviewDiversityIndex(input: RuntimeEpistemicIntegrityObserveInput): number {
  return scoreWorldviewDiversity(input);
}
