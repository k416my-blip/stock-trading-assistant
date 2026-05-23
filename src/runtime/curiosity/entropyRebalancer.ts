/**
 * Entropy Rebalancer — adjust exploration ratio when entropy low.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { measureAdaptiveEntropy } from '../evolution/adaptiveEntropyEngine';
import { ENTROPY_LOW_THRESHOLD } from '../../constants/runtimeEvolution';

export function computeEntropyBalance(
  store: AdaptiveRuntimeLearningState,
  contradictionCount = 0,
): { entropyBalance: number; boostExploration: boolean } {
  const entropy = measureAdaptiveEntropy(store, contradictionCount);
  const entropyBalance = entropy.entropyScore;
  return {
    entropyBalance: Math.round(entropyBalance * 1000) / 1000,
    boostExploration: entropyBalance < ENTROPY_LOW_THRESHOLD,
  };
}
