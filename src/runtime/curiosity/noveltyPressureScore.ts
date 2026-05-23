/**
 * Novelty Pressure Score
 * noveltyPressure = sameRootDominance + replayReuseRate + rollbackFrequency - minorityEdgeUsage
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { getRollbackFrequency } from '../governance/adaptiveRollbackSystem';

export function computeNoveltyPressure(store: AdaptiveRuntimeLearningState): {
  noveltyPressure: number;
  sameRootDominance: number;
  replayReuseRate: number;
  rollbackFrequency: number;
  minorityEdgeUsage: number;
} {
  const roots = Object.values(store.rootRankingHistory);
  const total = roots.reduce((s, r) => s + r.count, 0);
  const max = total > 0 ? Math.max(...roots.map((r) => r.count)) : 0;
  const sameRootDominance = total > 0 ? max / total : 0;

  const replayReuseRate = Math.min(1, store.replayCount / Math.max(10, Object.keys(store.edges).length * 2));
  const rollbackFrequency = Math.min(1, getRollbackFrequency() / 10);

  const minority = Object.values(store.edges).filter(
    (e) => e.hitCount <= 5 && e.successfulPredictionCount / Math.max(1, e.hitCount) >= 0.35,
  );
  const minorityEdgeUsage = Math.min(1, minority.length / Math.max(1, Object.keys(store.edges).length));

  const noveltyPressure = Math.max(
    0,
    Math.min(
      1,
      sameRootDominance + replayReuseRate + rollbackFrequency - minorityEdgeUsage * 0.5,
    ),
  );

  return {
    noveltyPressure: Math.round(noveltyPressure * 1000) / 1000,
    sameRootDominance: Math.round(sameRootDominance * 1000) / 1000,
    replayReuseRate: Math.round(replayReuseRate * 1000) / 1000,
    rollbackFrequency: Math.round(rollbackFrequency * 1000) / 1000,
    minorityEdgeUsage: Math.round(minorityEdgeUsage * 1000) / 1000,
  };
}
