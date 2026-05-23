/**
 * Adaptive Forgetting — gradual low-importance history fade.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { edgeRelevance } from './memoryRelevanceHalfLife';
import { isEdgeTombstoned } from './metabolismStorage';

export function applyAdaptiveForgetting(
  store: AdaptiveRuntimeLearningState,
  nutritionScore: number,
  nowMs = Date.now(),
): { forgotten: number } {
  const ageMs = Math.max(0, nowMs - Date.parse(store.lastUpdatedAt));
  const rel = edgeRelevance(ageMs);
  const forgetRate = nutritionScore < 0.45 ? 0.15 : 0.05;
  let forgotten = 0;

  for (const rec of Object.values(store.edges)) {
    if (rec.protectedInvariant || isEdgeTombstoned(rec.edgeKey)) continue;
    const importance =
      rec.runtimeLearnedWeight * rel * (rec.successfulPredictionCount / Math.max(1, rec.hitCount));
    if (importance < 0.12) {
      rec.runtimeLearnedWeight = Math.max(0.01, rec.runtimeLearnedWeight * (1 - forgetRate));
      rec.confidenceEma *= 1 - forgetRate * 0.5;
      forgotten += 1;
    }
  }

  for (const key of Object.keys(store.rootRankingHistory)) {
    const rank = store.rootRankingHistory[key];
    if (rank.count <= 1 && rel < 0.3) {
      rank.count = Math.max(0, rank.count - 1);
      forgotten += 1;
    }
  }

  return { forgotten };
}
