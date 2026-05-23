/**
 * Adaptive Diversity Preserver — keep minority / rare / cross-device paths.
 */
import type { DiversityPreservationResult } from '../../types/runtimeEvolution';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';

export function preserveAdaptiveDiversity(
  store: AdaptiveRuntimeLearningState,
): DiversityPreservationResult {
  let minorityPathsKept = 0;
  let rareLineageKept = 0;
  let lowFrequencyRootsKept = 0;
  let prunedNoveltyBlocked = 0;

  const edges = Object.values(store.edges);
  const weightMedian =
    edges.length === 0
      ? 0
      : [...edges.map((e) => e.runtimeLearnedWeight)].sort((a, b) => a - b)[
          Math.floor(edges.length / 2)
        ] ?? 0;

  for (const rec of edges) {
    const isMinority = rec.runtimeLearnedWeight < weightMedian && rec.successfulPredictionCount > 0;
    const isRare = rec.hitCount <= 3 && rec.runtimeLearnedWeight >= 0.35;
    const highNovelty = rec.falsePositiveCount > 0 && rec.hitCount < 5;

    if (isProtectedEdge(String(rec.from), String(rec.to), rec.relation) || rec.protectedInvariant) {
      minorityPathsKept += isMinority ? 1 : 0;
      continue;
    }

    if (isMinority) {
      rec.protectedInvariant = rec.protectedInvariant || false;
      minorityPathsKept += 1;
    }
    if (isRare) rareLineageKept += 1;
    if (highNovelty) prunedNoveltyBlocked += 1;
  }

  for (const [, rank] of Object.entries(store.rootRankingHistory)) {
    if (rank.count <= 2 && rank.successCount > 0) lowFrequencyRootsKept += 1;
  }

  const profiles = new Set([store.deviceProfile]);
  const crossDeviceVariationScore = Math.min(1, profiles.size / 2);

  return {
    minorityPathsKept,
    rareLineageKept,
    lowFrequencyRootsKept,
    crossDeviceVariationScore,
    prunedNoveltyBlocked,
  };
}

export function shouldBlockPruneEdge(
  edgeKey: string,
  store: AdaptiveRuntimeLearningState,
): boolean {
  const rec = store.edges[edgeKey];
  if (!rec) return false;
  if (isProtectedEdge(String(rec.from), String(rec.to), rec.relation)) return true;
  if (rec.hitCount <= 3 && rec.successfulPredictionCount > 0) return true;
  if (rec.falsePositiveCount > 0 && rec.hitCount < 5) return true;
  return false;
}
