/**
 * Anti-Fossilization Layer — soften rigid governance/recovery patterns (sandbox).
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { assessDogmatismRisk } from './antiDogmatismEngine';
import { runCuriosityExplorationRecovery } from './curiosityExplorationRecoveryLayer';

export function runAntiFossilizationPass(
  store: AdaptiveRuntimeLearningState,
  seed: number,
): { fossilizationRisk: number; softened: boolean } {
  const dogma = assessDogmatismRisk(store);
  if (dogma.fossilizationRisk < 0.45) {
    return { fossilizationRisk: dogma.fossilizationRisk, softened: false };
  }
  const recovery = runCuriosityExplorationRecovery(store, seed, true);
  return {
    fossilizationRisk: dogma.fossilizationRisk,
    softened: recovery.explored > 0,
  };
}
