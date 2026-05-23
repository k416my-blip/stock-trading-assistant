/**
 * Runtime Innovation Score — room for runtime evolution.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { detectReplayMonoculture } from './replayMonocultureDetector';
import { countMinorityEdges } from './minorityEdgePreservation';

export function computeInnovationScore(store: AdaptiveRuntimeLearningState): number {
  const mono = detectReplayMonoculture(store);
  const minority = countMinorityEdges(store);
  const total = Object.keys(store.edges).length;
  const altRecovery = Object.keys(store.recovery).length;
  const novelty =
    Math.min(1, minority / Math.max(1, total * 0.2)) * 0.4 +
    Math.min(1, altRecovery / 5) * 0.3 +
    (1 - mono.replayMonocultureRisk) * 0.3;
  return Math.round(novelty * 1000) / 1000;
}
