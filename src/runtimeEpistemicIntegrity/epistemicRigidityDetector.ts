import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import { scoreEpistemicRigidity } from './runtimeEpistemicEvolutionCoordinator';

export function resetEpistemicRigidityDetectorForTest(): void {
  /* stateless */
}

export function detectEpistemicRigidity(input: RuntimeEpistemicIntegrityObserveInput): number {
  return scoreEpistemicRigidity(input);
}
