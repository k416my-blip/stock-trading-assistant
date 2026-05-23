import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import {
  MINORITY_EDGE_RATIO_MIN,
  MUTATION_NOVELTY_MIN,
  REPLAY_REUSE_CIVILIZATION,
  REPLAY_ROOT_SHARE_CIVILIZATION,
} from '../../constants/runtimeLongevity';
import { computeNoveltyPressure } from '../curiosity/noveltyPressureScore';
import { countMinorityEdges } from '../curiosity/minorityEdgePreservation';

export function detectReplayCivilization(store: AdaptiveRuntimeLearningState): {
  replayCivilizationRisk: number;
  isCivilization: boolean;
} {
  const roots = Object.values(store.rootRankingHistory);
  const total = roots.reduce((s, r) => s + r.count, 0);
  const replayRootShare = total > 0 ? Math.max(...roots.map((r) => r.count)) / total : 0;
  const novelty = computeNoveltyPressure(store);
  const replayReuseRate = novelty.replayReuseRate;
  const edgeTotal = Object.keys(store.edges).length;
  const mutationNovelty = Math.min(1, countMinorityEdges(store) / Math.max(1, edgeTotal * 0.25));
  const minorityEdgeRatio = edgeTotal > 0 ? countMinorityEdges(store) / edgeTotal : 0;

  const isCivilization =
    replayRootShare > REPLAY_ROOT_SHARE_CIVILIZATION &&
    replayReuseRate > REPLAY_REUSE_CIVILIZATION &&
    mutationNovelty < MUTATION_NOVELTY_MIN &&
    minorityEdgeRatio < MINORITY_EDGE_RATIO_MIN;

  const replayCivilizationRisk = Math.min(
    1,
    (replayRootShare > REPLAY_ROOT_SHARE_CIVILIZATION ? 0.35 : 0) +
      (replayReuseRate > REPLAY_REUSE_CIVILIZATION ? 0.35 : 0) +
      (mutationNovelty < MUTATION_NOVELTY_MIN ? 0.15 : 0) +
      (minorityEdgeRatio < MINORITY_EDGE_RATIO_MIN ? 0.15 : 0),
  );

  return {
    replayCivilizationRisk: Math.round(replayCivilizationRisk * 1000) / 1000,
    isCivilization,
  };
}
