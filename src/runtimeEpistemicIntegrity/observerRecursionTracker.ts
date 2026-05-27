import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import { scoreObserverRecursion } from './runtimeEpistemicEvolutionCoordinator';

export function resetObserverRecursionTrackerForTest(): void {
  /* stateless */
}

export function trackObserverRecursion(input: RuntimeEpistemicIntegrityObserveInput): number {
  return scoreObserverRecursion(input);
}
