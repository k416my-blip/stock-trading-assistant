/**
 * Controlled Contradiction Injection — light contradiction noise in sandbox only.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { runSandboxMutation } from './controlledMutationSandbox';

export function injectControlledContradiction(
  store: AdaptiveRuntimeLearningState,
  seed: number,
): { injected: boolean } {
  const result = runSandboxMutation(
    store,
    'contradiction_probe',
    'controlled contradiction probe',
    seed + 7,
  );
  return { injected: result.applied };
}
