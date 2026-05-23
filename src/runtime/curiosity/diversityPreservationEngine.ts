/**
 * Diversity Preservation Engine — runtime diversity retention.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { measureAdaptiveEntropy } from '../evolution/adaptiveEntropyEngine';

export function computeDiversityRetention(
  store: AdaptiveRuntimeLearningState,
  contradictionCount = 0,
): number {
  const entropy = measureAdaptiveEntropy(store, contradictionCount);
  const roots = Object.values(store.rootRankingHistory);
  const spread =
    roots.length < 2
      ? 0.5
      : 1 -
        Math.max(...roots.map((r) => r.count)) /
          Math.max(1, roots.reduce((s, r) => s + r.count, 0));
  return Math.round(((entropy.entropyScore + spread) / 2) * 1000) / 1000;
}
