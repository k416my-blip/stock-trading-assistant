import { detectFossilizedState } from './fossilizedStateDetector';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { rotateReplayMutationFamilies } from './replayMutationRotator';

export function preventRuntimeCrust(store: AdaptiveRuntimeLearningState, seed: number): { softened: boolean } {
  const fossil = detectFossilizedState(store);
  if (!fossil.isFossilized) return { softened: false };
  const rotated = rotateReplayMutationFamilies(seed);
  return { softened: rotated.length > 0 };
}
