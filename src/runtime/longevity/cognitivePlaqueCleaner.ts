import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';

export function cleanCognitivePlaque(store: AdaptiveRuntimeLearningState): { plaqueScore: number } {
  const highConfStale = Object.values(store.edges).filter(
    (e) => e.confidenceEma > 0.92 && e.hitCount < 3,
  ).length;
  const plaqueScore = Math.min(1, highConfStale / Math.max(1, Object.keys(store.edges).length));
  return { plaqueScore: Math.round(plaqueScore * 1000) / 1000 };
}
