/**
 * Long-term decay governance — 7d/30d stale pruning and compression.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { STALE_EDGE_DAYS_30_MS, STALE_EDGE_DAYS_7_MS } from '../../constants/adaptiveRuntimeGovernance';

export type LongTermDecayResult = {
  pruned7d: number;
  pruned30d: number;
  histogramsCompressed: number;
  transitionsPruned: number;
};

export function applyLongTermDecayGovernance(
  store: AdaptiveRuntimeLearningState,
  nowMs: number = Date.now(),
): LongTermDecayResult {
  let pruned7d = 0;
  let pruned30d = 0;
  let transitionsPruned = 0;

  const lastUpdated = Date.parse(store.lastUpdatedAt);

  for (const [key, rec] of Object.entries(store.edges)) {
    if (rec.protectedInvariant) continue;
    const age = nowMs - lastUpdated;
    const stale = rec.hitCount > 0 && rec.successfulPredictionCount / rec.hitCount < 0.2;
    if (stale && age > STALE_EDGE_DAYS_7_MS) {
      rec.runtimeLearnedWeight *= 0.7;
      pruned7d += 1;
    }
    if (stale && rec.hitCount < 3 && age > STALE_EDGE_DAYS_30_MS) {
      delete store.edges[key];
      pruned30d += 1;
    }
  }

  for (const [key, tr] of Object.entries(store.transitions)) {
    if (tr.hitCount < 2 || tr.observedCount / Math.max(1, tr.hitCount) < 0.15) {
      delete store.transitions[key];
      transitionsPruned += 1;
    }
  }

  let histogramsCompressed = 0;
  for (const [key, hist] of Object.entries(store.gapHistograms)) {
    if (hist.length > 24) {
      store.gapHistograms[key] = hist.slice(-24);
      histogramsCompressed += 1;
    }
  }

  return { pruned7d, pruned30d, histogramsCompressed, transitionsPruned };
}

export function countStaleOptimizations(store: AdaptiveRuntimeLearningState): number {
  return Object.values(store.edges).filter(
    (e) =>
      !e.protectedInvariant &&
      e.hitCount >= 2 &&
      e.successfulPredictionCount / e.hitCount < 0.3 &&
      e.runtimeLearnedWeight < 0.4,
  ).length;
}
