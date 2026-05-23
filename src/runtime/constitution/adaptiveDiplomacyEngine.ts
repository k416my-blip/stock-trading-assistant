/**
 * Adaptive Diplomacy Engine — layer negotiation and compromise.
 */
import type { DiplomacyOutcome, LayerConflict, LayerPressureMap } from '../../types/runtimeConstitution';

export function runAdaptiveDiplomacy(
  conflicts: LayerConflict[],
  pressures: LayerPressureMap,
): DiplomacyOutcome {
  const negotiationWeights: DiplomacyOutcome['negotiationWeights'] = {};
  const cooperativeSuppressions: string[] = [];
  let sharedCooldownMs = 0;
  let compromiseJa = 'layers aligned';

  for (const c of conflicts) {
    if (c.kind === 'governance_vs_exploration') {
      negotiationWeights.governance = 0.55;
      negotiationWeights.exploration = 0.35;
      cooperativeSuppressions.push('sandbox_exploration');
      compromiseJa = 'governance/exploration → sandbox exploration';
      sharedCooldownMs = Math.max(sharedCooldownMs, 12_000);
    }
    if (c.kind === 'recovery_vs_async') {
      negotiationWeights.recovery = 0.4;
      negotiationWeights.async = 0.5;
      cooperativeSuppressions.push('recovery_throttle');
      compromiseJa = 'recovery/async → shared cooldown';
      sharedCooldownMs = Math.max(sharedCooldownMs, 15_000);
    }
    if (c.kind === 'entropy_vs_stability') {
      negotiationWeights.entropy = 0.35;
      negotiationWeights.survival = 0.55;
      cooperativeSuppressions.push('entropy_cap');
      compromiseJa = 'entropy capped for survival';
    }
  }

  if (pressures.observability > 0.6 && pressures.async > 0.55) {
    cooperativeSuppressions.push('observability_sample_throttle');
    sharedCooldownMs = Math.max(sharedCooldownMs, 8_000);
  }

  return {
    negotiationWeights,
    cooperativeSuppressions,
    sharedCooldownMs,
    compromiseJa,
  };
}
