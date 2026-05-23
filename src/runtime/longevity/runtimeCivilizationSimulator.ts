import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import type { CivilizationSimulationReport, DiversitySimulationHorizon } from '../../types/runtimeLongevity';
import { detectReplayCivilization } from './replayCivilizationBreaker';
import { detectFossilizedState } from './fossilizedStateDetector';
import { assessEntropyHealth } from './entropyCollapseDetector';

export function simulateCivilizationHorizon(
  store: AdaptiveRuntimeLearningState,
  entropyScore: number,
  horizonDays: DiversitySimulationHorizon,
): CivilizationSimulationReport {
  const scale = horizonDays / 180;
  const civ = detectReplayCivilization(store);
  const fossil = detectFossilizedState(store);
  const entropy = assessEntropyHealth(entropyScore);
  return {
    horizonDays,
    entropyCollapse: Math.min(1, entropy.collapseRisk + scale * 0.1),
    replayCivilization: Math.min(1, civ.replayCivilizationRisk + scale * 0.08),
    fossilization: Math.min(1, fossil.fossilizationRisk + scale * 0.1),
    summaryJa: `${horizonDays}日: entropy=${entropy.collapseRisk.toFixed(2)} civ=${civ.replayCivilizationRisk.toFixed(2)}`,
  };
}

export function runCivilizationSimulationSuite(
  store: AdaptiveRuntimeLearningState,
  entropyScore: number,
): CivilizationSimulationReport[] {
  return ([30, 90, 180] as const).map((h) => simulateCivilizationHorizon(store, entropyScore, h));
}
