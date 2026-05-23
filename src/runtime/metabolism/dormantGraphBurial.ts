/**
 * Dormant Graph Burial — long-unused nodes to buried/dormant state.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { buryGraphNode, isEdgeTombstoned } from './metabolismStorage';
import { edgeRelevance } from './memoryRelevanceHalfLife';

export function buryDormantGraphNodes(
  store: AdaptiveRuntimeLearningState,
  nowMs = Date.now(),
): { buried: number } {
  const ageMs = Math.max(0, nowMs - Date.parse(store.lastUpdatedAt));
  const rel = edgeRelevance(ageMs);
  let buried = 0;

  for (const [key, rec] of Object.entries(store.edges)) {
    if (isEdgeTombstoned(key)) continue;
    if (rec.hitCount < 2 && rec.runtimeLearnedWeight < 0.2 && rel < 0.35) {
      buryGraphNode(key, 'edge', store.lastUpdatedAt);
      buried += 1;
    }
  }

  for (const [key, tr] of Object.entries(store.transitions)) {
    if (tr.hitCount < 2 && tr.observedCount / Math.max(1, tr.hitCount) < 0.2) {
      buryGraphNode(key, 'transition', store.lastUpdatedAt);
      buried += 1;
    }
  }

  return { buried };
}
