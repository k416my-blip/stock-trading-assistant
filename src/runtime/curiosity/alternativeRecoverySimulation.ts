/**
 * Alternative Recovery Simulation — evaluate non-default recovery in sandbox.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { runSandboxMutation } from './controlledMutationSandbox';

export function simulateAlternativeRecovery(
  store: AdaptiveRuntimeLearningState,
  seed: number,
): { simulated: boolean } {
  const keys = Object.keys(store.recovery);
  if (keys.length === 0) return { simulated: false };
  const key = keys[seed % keys.length];
  const result = runSandboxMutation(store, 'recovery_alt', `alt recovery ${key}`, seed);
  return { simulated: result.applied };
}
