/**
 * Memory Nutrition Score — what to keep vs metabolize.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { edgeRelevance } from './memoryRelevanceHalfLife';
import { isEdgeTombstoned, getMetabolismStorageStats } from './metabolismStorage';

export function computeMemoryNutritionScore(
  store: AdaptiveRuntimeLearningState,
  nowMs = Date.now(),
): number {
  const edges = Object.values(store.edges);
  if (edges.length === 0) return 1;

  const lastUpdated = Date.parse(store.lastUpdatedAt);
  const ageMs = Math.max(0, nowMs - lastUpdated);

  let keepMass = 0;
  let totalMass = 0;
  for (const e of edges) {
    if (isEdgeTombstoned(e.edgeKey)) continue;
    const rel = edgeRelevance(ageMs) * e.runtimeLearnedWeight;
    const nutrition =
      e.protectedInvariant ? 1 : Math.min(1, rel + e.successfulPredictionCount / Math.max(1, e.hitCount) * 0.3);
    keepMass += nutrition * e.runtimeLearnedWeight;
    totalMass += e.runtimeLearnedWeight;
  }

  const stats = getMetabolismStorageStats();
  const cemeteryPenalty = Math.min(0.2, stats.replayCemeterySize / 200);
  const tombstonePenalty = Math.min(0.15, stats.tombstoneCount / 100);

  const raw = totalMass === 0 ? 0.7 : keepMass / totalMass;
  return Math.round(Math.max(0, Math.min(1, raw - cemeteryPenalty - tombstonePenalty)) * 1000) / 1000;
}
