/**
 * Long-term constitutional simulation — 1/7/30/90 day horizons (mock).
 */
import type {
  ConstitutionalSimulationHorizon,
  ConstitutionalSimulationReport,
  LayerPressureMap,
} from '../../types/runtimeConstitution';
import { detectLayerConflicts } from './layerConflictDetector';
import { computeEquilibriumScore } from './runtimeConstitutionCoordinator';
import { predictSystemicCollapse } from './systemicCollapsePredictor';

export function simulateConstitutionalHorizon(
  pressures: LayerPressureMap,
  horizonDays: ConstitutionalSimulationHorizon,
): ConstitutionalSimulationReport {
  const scale = horizonDays / 90;
  const conflicts = detectLayerConflicts(pressures);
  const collapse = predictSystemicCollapse(pressures, conflicts);
  const equilibrium = computeEquilibriumScore(pressures);

  const equilibriumRetention = Math.max(0, equilibrium - scale * 0.15);
  const monopolyPrevention = Math.max(0, 1 - conflicts.layerDominanceIndex);
  const democracyStability = Math.max(0, 1 - collapse.civilWarRisk - scale * 0.1);
  const recoveryAddiction = pressures.recovery * (0.5 + scale * 0.3);
  const governanceOverreach = pressures.governance * (0.4 + scale * 0.25);
  const entropyRunaway = collapse.entropyRunawayRisk;
  const asyncStarvation = collapse.asyncStarvationRisk;

  return {
    horizonDays,
    equilibriumRetention: Math.round(equilibriumRetention * 1000) / 1000,
    monopolyPrevention: Math.round(monopolyPrevention * 1000) / 1000,
    democracyStability: Math.round(democracyStability * 1000) / 1000,
    recoveryAddiction: Math.round(recoveryAddiction * 1000) / 1000,
    governanceOverreach: Math.round(governanceOverreach * 1000) / 1000,
    entropyRunaway: Math.round(entropyRunaway * 1000) / 1000,
    asyncStarvation: Math.round(asyncStarvation * 1000) / 1000,
    summaryJa: `${horizonDays}日: 均衡${(equilibriumRetention * 100).toFixed(0)}% 独占防止${(monopolyPrevention * 100).toFixed(0)}%`,
  };
}

export function runConstitutionalSimulationSuite(
  pressures: LayerPressureMap,
): ConstitutionalSimulationReport[] {
  return ([1, 7, 30, 90] as ConstitutionalSimulationHorizon[]).map((h) =>
    simulateConstitutionalHorizon(pressures, h),
  );
}
