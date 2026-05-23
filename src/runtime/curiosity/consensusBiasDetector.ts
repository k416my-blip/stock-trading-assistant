/**
 * Consensus Bias Detector — unanimous path danger.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { CONSENSUS_BIAS_THRESHOLD } from '../../constants/runtimeCuriosity';

export function detectConsensusBias(store: AdaptiveRuntimeLearningState): {
  consensusBiasRisk: number;
  unanimousRoot: boolean;
} {
  const roots = Object.values(store.rootRankingHistory);
  if (roots.length < 2) return { consensusBiasRisk: 0, unanimousRoot: false };
  const total = roots.reduce((s, r) => s + r.count, 0);
  const maxShare = Math.max(...roots.map((r) => r.count)) / Math.max(1, total);
  const unanimousRoot = maxShare >= CONSENSUS_BIAS_THRESHOLD;
  const highConf = Object.values(store.edges).filter((e) => e.confidenceEma > 0.9).length;
  const consensusBiasRisk = Math.min(1, maxShare * 0.6 + Math.min(1, highConf / 8) * 0.4);
  return {
    consensusBiasRisk: Math.round(consensusBiasRisk * 1000) / 1000,
    unanimousRoot,
  };
}
