/**
 * Minority Edge Preservation — do not prune low-frequency successful paths.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';
import { MINORITY_EDGE_HIT_MAX, MINORITY_SUCCESS_MIN } from '../../constants/runtimeCuriosity';

export function countMinorityEdges(store: AdaptiveRuntimeLearningState): number {
  return Object.values(store.edges).filter(isMinorityEdge).length;
}

export function isMinorityEdge(
  rec: AdaptiveRuntimeLearningState['edges'][string],
): boolean {
  if (!rec || rec.protectedInvariant) return false;
  if (isProtectedEdge(String(rec.from), String(rec.to), rec.relation)) return true;
  return (
    rec.hitCount <= MINORITY_EDGE_HIT_MAX &&
    rec.successfulPredictionCount / Math.max(1, rec.hitCount) >= MINORITY_SUCCESS_MIN
  );
}

export function minorityEdgeHealth(store: AdaptiveRuntimeLearningState): number {
  const total = Object.keys(store.edges).length;
  if (total === 0) return 0.5;
  return Math.min(1, countMinorityEdges(store) / Math.max(1, total * 0.3));
}
