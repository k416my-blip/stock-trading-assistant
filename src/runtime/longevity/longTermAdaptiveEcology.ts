import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';

export function computeEcologyPressure(
  store: AdaptiveRuntimeLearningState,
  entropyScore: number,
  asyncDepth: number,
): number {
  const edgeLoad = Object.keys(store.edges).length / 200;
  const replayLoad = store.replayCount / 40;
  const entropyStress = entropyScore < 0.25 ? 0.4 : entropyScore > 0.82 ? 0.35 : 0;
  const asyncStress = Math.min(0.3, asyncDepth / 64);
  return Math.round(Math.min(1, edgeLoad * 0.25 + replayLoad * 0.2 + entropyStress + asyncStress) * 1000) / 1000;
}
