/**
 * Long-Term Diversity Simulator — 30/90/180 day diversity drift.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import type { DiversitySimulationHorizon, DiversitySimulationReport } from '../../types/runtimeCuriosity';
import { computeNoveltyPressure } from './noveltyPressureScore';
import { computeDiversityRetention } from './diversityPreservationEngine';
import { assessRollbackAddictionRisk } from './rollbackAddictionRecovery';

export function simulateDiversityHorizon(
  store: AdaptiveRuntimeLearningState,
  horizonDays: DiversitySimulationHorizon,
  driftScore: number,
): DiversitySimulationReport {
  const novelty = computeNoveltyPressure(store);
  const diversity = computeDiversityRetention(store);
  const rollback = assessRollbackAddictionRisk(store, driftScore);
  const scale = horizonDays / 180;

  const replayFixation = Math.min(1, novelty.replayReuseRate + scale * 0.15);
  const diversityDecay = Math.min(1, 1 - diversity + scale * 0.1);
  const governanceRigidity = Math.min(1, novelty.sameRootDominance + scale * 0.12);
  const entropyCollapse = Math.min(1, novelty.noveltyPressure * 0.8);
  const rollbackAddiction = rollback;
  const curiosityStarvation = Math.min(1, novelty.noveltyPressure * 0.6 + diversityDecay * 0.4);

  return {
    horizonDays,
    replayFixation: Math.round(replayFixation * 1000) / 1000,
    diversityDecay: Math.round(diversityDecay * 1000) / 1000,
    governanceRigidity: Math.round(governanceRigidity * 1000) / 1000,
    entropyCollapse: Math.round(entropyCollapse * 1000) / 1000,
    rollbackAddiction: Math.round(rollbackAddiction * 1000) / 1000,
    curiosityStarvation: Math.round(curiosityStarvation * 1000) / 1000,
    summaryJa: `${horizonDays}日: fixation=${replayFixation.toFixed(2)} diversity=${diversity.toFixed(2)} starvation=${curiosityStarvation.toFixed(2)}`,
  };
}

export function runDiversitySimulationSuite(
  store: AdaptiveRuntimeLearningState,
  driftScore: number,
): DiversitySimulationReport[] {
  return ([30, 90, 180] as const).map((h) => simulateDiversityHorizon(store, h, driftScore));
}
