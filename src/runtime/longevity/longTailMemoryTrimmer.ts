import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';

export function trimLongTailMemory(store: AdaptiveRuntimeLearningState): { trimmed: number } {
  let trimmed = 0;
  for (const [key, edge] of Object.entries(store.edges)) {
    if (edge.hitCount <= 2 && edge.runtimeLearnedWeight < 0.2 && !edge.protectedInvariant) {
      trimmed += 1;
      void key;
    }
  }
  return { trimmed };
}
