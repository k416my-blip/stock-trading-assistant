/**
 * Stale Edge Cremation — tombstone unused causal edges (recoverable).
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';
import { STALE_EDGE_HIT_MAX, STALE_EDGE_WEIGHT_MAX } from '../../constants/runtimeMetabolism';
import { isEdgeTombstoned, tombstoneEdge } from './metabolismStorage';

export function cremateStaleEdges(
  store: AdaptiveRuntimeLearningState,
  tombstoneOnly = false,
): { tombstoned: number } {
  let tombstoned = 0;
  for (const [key, rec] of Object.entries(store.edges)) {
    if (rec.protectedInvariant || isProtectedEdge(String(rec.from), String(rec.to), rec.relation)) {
      continue;
    }
    if (isEdgeTombstoned(key)) continue;
    const stale =
      rec.hitCount <= STALE_EDGE_HIT_MAX &&
      rec.runtimeLearnedWeight <= STALE_EDGE_WEIGHT_MAX &&
      rec.successfulPredictionCount / Math.max(1, rec.hitCount) < 0.25;
    if (!stale) continue;

    const t = tombstoneEdge(
      key,
      String(rec.from),
      String(rec.to),
      rec.relation,
      rec.runtimeLearnedWeight,
      'stale edge cremation',
    );
    if (t) {
      if (!tombstoneOnly) {
        rec.runtimeLearnedWeight = 0.02;
        rec.confidenceEma *= 0.5;
        rec.decayReliability *= 0.6;
      }
      tombstoned += 1;
    }
  }
  return { tombstoned };
}
