import {
  FOSSIL_NO_NOVEL_MUTATION_TICKS,
  FOSSIL_REPLAY_DOMINANCE,
  FOSSIL_SAME_ROOT_TICKS,
} from '../../constants/runtimeLongevity';
import { getFossilCounters } from './longevityStorage';
import { computeNoveltyPressure } from '../curiosity/noveltyPressureScore';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';

export function detectFossilizedState(store: AdaptiveRuntimeLearningState): {
  fossilizationRisk: number;
  isFossilized: boolean;
} {
  const counters = getFossilCounters();
  const novelty = computeNoveltyPressure(store);
  const replayDominance = novelty.sameRootDominance;

  const isFossilized =
    counters.sameRootTicks >= FOSSIL_SAME_ROOT_TICKS &&
    counters.noNovelMutationTicks >= FOSSIL_NO_NOVEL_MUTATION_TICKS &&
    replayDominance >= FOSSIL_REPLAY_DOMINANCE;

  let fossilizationRisk = 0;
  fossilizationRisk += Math.min(0.4, counters.sameRootTicks / FOSSIL_SAME_ROOT_TICKS);
  fossilizationRisk += Math.min(0.35, counters.noNovelMutationTicks / FOSSIL_NO_NOVEL_MUTATION_TICKS);
  fossilizationRisk += Math.min(0.25, replayDominance);

  return {
    fossilizationRisk: Math.round(Math.min(1, fossilizationRisk) * 1000) / 1000,
    isFossilized,
  };
}
