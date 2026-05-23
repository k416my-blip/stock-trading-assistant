/**
 * Long-session evolution simulation — 1/3/7/30 day horizons (mock).
 */
import type {
  EvolutionSimulationHorizon,
  EvolutionSimulationReport,
} from '../../types/runtimeEvolution';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { collectEvolutionSignals, resolveEvolutionHealthState } from './runtimeEvolutionMonitor';
import { measureAdaptiveEntropy } from './adaptiveEntropyEngine';
import { detectReplayBias } from './replayBiasDetector';
import { evaluateRollbackDependency } from './rollbackDependencyGuard';
import { preserveAdaptiveDiversity } from './adaptiveDiversityPreserver';

export function simulateEvolutionHorizon(
  store: AdaptiveRuntimeLearningState,
  horizonDays: EvolutionSimulationHorizon,
  driftScore: number,
): EvolutionSimulationReport {
  const scale = horizonDays / 30;
  const signals = collectEvolutionSignals(store);
  const entropy = measureAdaptiveEntropy(store);
  const replay = detectReplayBias(store);
  const rollback = evaluateRollbackDependency(store, driftScore);
  const diversity = preserveAdaptiveDiversity(store);
  const health = resolveEvolutionHealthState(signals);

  const stagnationRisk = Math.min(
    1,
    signals.learningStagnation * 0.4 + (1 - entropy.entropyScore) * 0.4 + scale * 0.2,
  );
  const replayFixation = replay.replayBiasScore;
  const adaptiveCollapseRisk = health === 'COLLAPSING' || health === 'OVERFITTED' ? 0.8 : 0.25 * scale;
  const hiddenDrift = signals.graphMutationRate < 0.05 && driftScore > 0.4 ? 0.7 : 0.2;
  const rollbackAddiction = rollback.recoveryAddiction ? 0.75 : rollback.rollbackPenalty;
  const entropyPreservation = entropy.entropyScore;
  const diversityRetention = Math.min(
    1,
    diversity.crossDeviceVariationScore * 0.3 +
      diversity.minorityPathsKept / Math.max(1, Object.keys(store.edges).length) +
      0.2,
  );

  return {
    horizonDays,
    stagnationRisk: Math.round(stagnationRisk * 1000) / 1000,
    replayFixation: Math.round(replayFixation * 1000) / 1000,
    adaptiveCollapseRisk: Math.round(adaptiveCollapseRisk * 1000) / 1000,
    hiddenDrift: Math.round(hiddenDrift * 1000) / 1000,
    rollbackAddiction: Math.round(rollbackAddiction * 1000) / 1000,
    entropyPreservation: Math.round(entropyPreservation * 1000) / 1000,
    diversityRetention: Math.round(diversityRetention * 1000) / 1000,
    summaryJa: `${horizonDays}日: 停滞${(stagnationRisk * 100).toFixed(0)}% 偏り${(replayFixation * 100).toFixed(0)}% 多様性${(diversityRetention * 100).toFixed(0)}%`,
  };
}

export function runEvolutionSimulationSuite(
  store: AdaptiveRuntimeLearningState,
  driftScore: number,
): EvolutionSimulationReport[] {
  return ([1, 3, 7, 30] as EvolutionSimulationHorizon[]).map((h) =>
    simulateEvolutionHorizon(store, h, driftScore),
  );
}
