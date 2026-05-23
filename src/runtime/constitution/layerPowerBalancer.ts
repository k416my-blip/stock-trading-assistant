/**
 * Layer Power Balancer — prevent single-layer runaway dominance.
 */
import type { LayerPowerBalance, LayerPressureMap, RuntimeLayerId } from '../../types/runtimeConstitution';
import { DOMINANCE_THRESHOLD, LAYER_BUDGET_DEFAULT } from '../../constants/runtimeConstitution';
import { computeLayerDominanceIndex } from './runtimeConstitutionCoordinator';

export function balanceLayerPower(pressures: LayerPressureMap): LayerPowerBalance {
  const dominantLayer = computeLayerDominanceIndex(pressures);
  const dominantPressure = pressures[dominantLayer];
  const suppressedLayers: RuntimeLayerId[] = [];
  const throttles: Partial<Record<RuntimeLayerId, number>> = {};
  const quotas = { ...LAYER_BUDGET_DEFAULT } as Record<RuntimeLayerId, number>;

  if (dominantPressure >= DOMINANCE_THRESHOLD) {
    suppressedLayers.push(dominantLayer);
    throttles[dominantLayer] = 0.45;
    quotas[dominantLayer] = Math.max(0.05, quotas[dominantLayer] * 0.5);

    const redistribute = (1 - quotas[dominantLayer]) / 6;
    for (const layer of Object.keys(quotas) as RuntimeLayerId[]) {
      if (layer !== dominantLayer) quotas[layer] += redistribute;
    }
  }

  if (pressures.recovery >= DOMINANCE_THRESHOLD) {
    throttles.recovery = 0.35;
    suppressedLayers.push('recovery');
  }
  if (pressures.async >= 0.75) {
    throttles.async = 0.55;
  }
  if (pressures.governance >= 0.75) {
    throttles.governance = 0.6;
  }

  return {
    dominantLayer,
    suppressedLayers: [...new Set(suppressedLayers)],
    quotas,
    throttles,
  };
}
