import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';

export function breakRecoveryRitual(store: AdaptiveRuntimeLearningState): { ritualized: boolean } {
  const ritualized = Object.values(store.recovery).filter((r) => r.attempts > 8 && r.successRate > 0.9).length >= 2;
  return { ritualized };
}
