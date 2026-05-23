/**
 * Replay Monoculture Detector — same replay dominance.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { REPLAY_MONOCULTURE_THRESHOLD } from '../../constants/runtimeCuriosity';

export function detectReplayMonoculture(store: AdaptiveRuntimeLearningState): {
  replayMonocultureRisk: number;
  dominantRoot: string | null;
  isMonoculture: boolean;
} {
  const entries = Object.entries(store.rootRankingHistory);
  if (entries.length === 0) {
    return { replayMonocultureRisk: 0, dominantRoot: null, isMonoculture: false };
  }
  const total = entries.reduce((s, [, v]) => s + v.count, 0);
  const sorted = [...entries].sort((a, b) => b[1].count - a[1].count);
  const [dominantRoot, top] = sorted[0];
  const dominance = total > 0 ? top.count / total : 0;
  const replayMonocultureRisk = Math.min(1, dominance * 0.7 + Math.min(1, store.replayCount / 20) * 0.3);
  return {
    replayMonocultureRisk: Math.round(replayMonocultureRisk * 1000) / 1000,
    dominantRoot,
    isMonoculture: dominance >= REPLAY_MONOCULTURE_THRESHOLD,
  };
}
