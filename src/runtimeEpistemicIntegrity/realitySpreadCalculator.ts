import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import { scoreRealitySpread } from './runtimeEpistemicEvolutionCoordinator';

export function resetRealitySpreadCalculatorForTest(): void {
  /* stateless */
}

export function calculateRealitySpread(input: RuntimeEpistemicIntegrityObserveInput): number {
  return scoreRealitySpread(input);
}
