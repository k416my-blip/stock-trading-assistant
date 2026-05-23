/**
 * Layer Conflict Detector — cross-layer local optimum collisions.
 */
import type { LayerConflict, LayerConflictReport, LayerPressureMap } from '../../types/runtimeConstitution';

function conflict(
  a: LayerConflict['layers'][0],
  b: LayerConflict['layers'][1],
  kind: string,
  severity: number,
  detailJa: string,
): LayerConflict {
  return { layers: [a, b], kind, severity, detailJa };
}

export function detectLayerConflicts(pressures: LayerPressureMap): LayerConflictReport {
  const conflicts: LayerConflict[] = [];

  if (pressures.governance > 0.55 && pressures.exploration > 0.45) {
    conflicts.push(
      conflict(
        'governance',
        'exploration',
        'governance_vs_exploration',
        (pressures.governance + pressures.exploration) / 2,
        'governance/exploration competition',
      ),
    );
  }
  if (pressures.recovery > 0.6 && pressures.async > 0.55) {
    conflicts.push(
      conflict(
        'recovery',
        'async',
        'recovery_vs_async',
        (pressures.recovery + pressures.async) / 2,
        'recovery starves async budget',
      ),
    );
  }
  if (pressures.entropy > 0.6 && pressures.survival > 0.5) {
    conflicts.push(
      conflict(
        'entropy',
        'survival',
        'entropy_vs_stability',
        (pressures.entropy + pressures.survival) / 2,
        'entropy destabilizes survival',
      ),
    );
  }
  if (pressures.observability > 0.55 && pressures.async > 0.5) {
    conflicts.push(
      conflict(
        'observability',
        'async',
        'observability_vs_performance',
        (pressures.observability + pressures.async) / 2,
        'journal pressure vs async throughput',
      ),
    );
  }
  if (pressures.governance > 0.5 && pressures.entropy > 0.55) {
    conflicts.push(
      conflict(
        'governance',
        'entropy',
        'replay_vs_adaptation',
        (pressures.governance + pressures.entropy) / 2,
        'rollback pressure vs exploration',
      ),
    );
  }

  const conflictSeverity =
    conflicts.length === 0
      ? 0
      : conflicts.reduce((s, c) => s + c.severity, 0) / conflicts.length;

  const values = Object.values(pressures);
  const layerDominanceIndex = Math.max(...values);
  const constitutionalRisk = Math.min(
    1,
    conflictSeverity * 0.6 + layerDominanceIndex * 0.4,
  );

  return {
    conflicts,
    conflictSeverity: Math.round(conflictSeverity * 1000) / 1000,
    constitutionalRisk: Math.round(constitutionalRisk * 1000) / 1000,
    layerDominanceIndex: Math.round(layerDominanceIndex * 1000) / 1000,
  };
}
