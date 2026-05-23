/**
 * Dormant Path Revival — conditional sandbox revival from tombstone/buried.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { getTombstone } from '../metabolism/metabolismStorage';
import { canDormantRevivalThisTick, noteDormantRevival } from './curiosityStorage';
import { runSandboxMutation } from './controlledMutationSandbox';

export function attemptDormantPathRevival(
  store: AdaptiveRuntimeLearningState,
  seed: number,
): { revived: number } {
  if (!canDormantRevivalThisTick()) return { revived: 0 };

  for (const key of Object.keys(store.edges)) {
    const tomb = getTombstone(key);
    if (!tomb) continue;
    const result = runSandboxMutation(store, 'dormant_revival', `revive ${key}`, seed + key.length);
    if (result.applied && !result.blocked) {
      noteDormantRevival();
      return { revived: 1 };
    }
  }
  return { revived: 0 };
}
