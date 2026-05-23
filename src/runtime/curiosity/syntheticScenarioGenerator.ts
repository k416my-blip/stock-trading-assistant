/**
 * Synthetic Scenario Generator — unknown cases in sandbox.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { noteSyntheticScenario } from './curiosityStorage';
import { archiveDeterministicReplay } from './curiosityStorage';

export function generateSyntheticScenario(
  store: AdaptiveRuntimeLearningState,
  seed: number,
): { scenarioJa: string } {
  const edgeCount = Object.keys(store.edges).length;
  const scenarioJa = `synthetic edge=${edgeCount} seed=${seed} thermal=sim`;
  noteSyntheticScenario();
  archiveDeterministicReplay(seed, scenarioJa, 'synthetic metrics only');
  return { scenarioJa };
}
