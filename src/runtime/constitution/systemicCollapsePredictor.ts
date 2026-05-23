/**
 * Systemic Collapse Predictor — civil war, deadlock, runaway risks.
 */
import type { CollapsePrediction, CollapseRiskLevel, LayerPressureMap } from '../../types/runtimeConstitution';
import type { LayerConflictReport } from '../../types/runtimeConstitution';
import { getRollbackFrequency } from '../governance/adaptiveRollbackSystem';
import { getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';

export function predictSystemicCollapse(
  pressures: LayerPressureMap,
  conflicts: LayerConflictReport,
): CollapsePrediction {
  const store = getAdaptiveLearningStore();
  const civilWarRisk = Math.min(
    1,
    conflicts.conflictSeverity * 0.5 +
      (pressures.governance > 0.6 && pressures.exploration > 0.5 ? 0.35 : 0),
  );
  const governanceDeadlockRisk = Math.min(
    1,
    pressures.governance * 0.6 + getRollbackFrequency() / 10,
  );
  const entropyRunawayRisk = Math.min(1, pressures.entropy * 0.7 + (1 - conflicts.layerDominanceIndex) * 0.2);
  const replayCollapseRisk = Math.min(1, store.replayCount / 30 + pressures.governance * 0.3);
  const asyncStarvationRisk = Math.min(1, pressures.async * 0.65 + pressures.recovery * 0.25);
  const recoveryMonopolizationRisk = Math.min(1, pressures.recovery * 0.75);

  const composite =
    (civilWarRisk +
      governanceDeadlockRisk +
      entropyRunawayRisk +
      replayCollapseRisk +
      asyncStarvationRisk +
      recoveryMonopolizationRisk) /
    6;

  let level: CollapseRiskLevel = 'LOW_RISK';
  if (composite >= 0.75) level = 'COLLAPSING';
  else if (composite >= 0.55) level = 'SEVERE';
  else if (composite >= 0.35) level = 'ELEVATED';

  return {
    level,
    civilWarRisk: Math.round(civilWarRisk * 1000) / 1000,
    governanceDeadlockRisk: Math.round(governanceDeadlockRisk * 1000) / 1000,
    entropyRunawayRisk: Math.round(entropyRunawayRisk * 1000) / 1000,
    replayCollapseRisk: Math.round(replayCollapseRisk * 1000) / 1000,
    asyncStarvationRisk: Math.round(asyncStarvationRisk * 1000) / 1000,
    recoveryMonopolizationRisk: Math.round(recoveryMonopolizationRisk * 1000) / 1000,
  };
}
