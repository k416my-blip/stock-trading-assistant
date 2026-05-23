/**
 * Exploration Recovery Layer (curiosity) — boost sandbox exploration when low.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { runSandboxMutation } from './controlledMutationSandbox';
import { computeEntropyBalance } from './entropyRebalancer';

export function runCuriosityExplorationRecovery(
  store: AdaptiveRuntimeLearningState,
  seed: number,
  force: boolean,
): { explored: number } {
  const { boostExploration } = computeEntropyBalance(store);
  if (!force && !boostExploration) return { explored: 0 };
  const result = runSandboxMutation(store, 'edge_weight_tweak', 'exploration recovery probe', seed);
  return { explored: result.applied ? 1 : 0 };
}
