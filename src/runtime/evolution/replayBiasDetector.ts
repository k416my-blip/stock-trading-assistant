/**
 * Replay Bias Detector — fixation and same-root dominance.
 */
import type { ReplayBiasMetrics } from '../../types/runtimeEvolution';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { REPLAY_BIAS_CRITICAL, REPLAY_BIAS_WARNING, ROOT_DOMINANCE_WARNING } from '../../constants/runtimeEvolution';

export function detectReplayBias(store: AdaptiveRuntimeLearningState): ReplayBiasMetrics {
  const roots = Object.entries(store.rootRankingHistory);
  const counts = roots.map(([, v]) => v.count);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = total > 0 ? Math.max(...counts) : 0;
  const rootDominanceIndex = total > 0 ? max / total : 0;

  const replayBiasScore = Math.min(
    1,
    rootDominanceIndex * 0.5 +
      Math.min(1, store.replayCount / Math.max(10, Object.keys(store.edges).length * 2)) * 0.5,
  );

  const sameRootDominance = rootDominanceIndex >= ROOT_DOMINANCE_WARNING;
  const replayFixation = store.replayCount >= 8 && store.replayCount > Object.keys(store.edges).length;

  const recoveryKeys = Object.values(store.recovery).filter((r) => r.attempts >= 3);
  const repetitiveRecoveryLineage = recoveryKeys.length >= 2 && recoveryKeys.every((r) => r.successRate > 0.9);

  const convergenceTrap =
    replayBiasScore >= REPLAY_BIAS_CRITICAL &&
    Object.values(store.edges).filter((e) => e.runtimeLearnedWeight > 0.8).length <= 2;

  return {
    replayBiasScore: Math.round(replayBiasScore * 1000) / 1000,
    rootDominanceIndex: Math.round(rootDominanceIndex * 1000) / 1000,
    sameRootDominance,
    replayFixation,
    repetitiveRecoveryLineage,
    convergenceTrap,
  };
}

export function isReplayBiasCritical(metrics: ReplayBiasMetrics): boolean {
  return metrics.replayBiasScore >= REPLAY_BIAS_CRITICAL || metrics.convergenceTrap;
}

export function isReplayBiasWarning(metrics: ReplayBiasMetrics): boolean {
  return metrics.replayBiasScore >= REPLAY_BIAS_WARNING;
}
