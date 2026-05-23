/**
 * Anti-Dogmatism Engine — root/path fixation detection.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { detectReplayMonoculture } from './replayMonocultureDetector';

export function assessDogmatismRisk(store: AdaptiveRuntimeLearningState): {
  fossilizationRisk: number;
  fixedPathCount: number;
} {
  const mono = detectReplayMonoculture(store);
  const highWeight = Object.values(store.edges).filter((e) => e.runtimeLearnedWeight > 0.88).length;
  const fixedPathCount = highWeight + (mono.isMonoculture ? 1 : 0);
  const fossilizationRisk = Math.min(
    1,
    mono.replayMonocultureRisk * 0.5 + Math.min(1, highWeight / 5) * 0.5,
  );
  return {
    fossilizationRisk: Math.round(fossilizationRisk * 1000) / 1000,
    fixedPathCount,
  };
}
