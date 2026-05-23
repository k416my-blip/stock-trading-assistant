/**
 * Constitutional Budget Engine — CPU/async/memory/mutation/replay allocation.
 */
import type { ConstitutionalBudget, LayerPowerBalance } from '../../types/runtimeConstitution';
import type { LayerPressureMap } from '../../types/runtimeConstitution';

export function allocateConstitutionalBudget(
  pressures: LayerPressureMap,
  balance: LayerPowerBalance,
): ConstitutionalBudget {
  const q = balance.quotas;
  const total = Object.values(q).reduce((a, b) => a + b, 0) || 1;

  const norm = (layer: keyof typeof q) => q[layer] / total;

  let cpuBudgetPct = Math.round((norm('survival') + norm('async') * 0.5) * 100);
  let asyncBudgetPct = Math.round(norm('async') * 100);
  let memoryBudgetPct = Math.round((norm('recovery') + norm('observability') * 0.3) * 100);
  let mutationBudgetPct = Math.round(norm('entropy') * 100);
  let replayBudgetPct = Math.round((norm('governance') + norm('exploration') * 0.4) * 100);

  const skew = Object.values(pressures);
  const fairnessScore =
    1 -
    Math.sqrt(skew.reduce((s, v) => s + (v - skew.reduce((a, b) => a + b, 0) / skew.length) ** 2, 0) / skew.length);

  if (fairnessScore < 0.45) {
    cpuBudgetPct = Math.min(cpuBudgetPct, 40);
    asyncBudgetPct = Math.min(asyncBudgetPct, 35);
    memoryBudgetPct = Math.min(memoryBudgetPct, 45);
    mutationBudgetPct = Math.min(mutationBudgetPct, 25);
    replayBudgetPct = Math.min(replayBudgetPct, 30);
  }

  return {
    cpuBudgetPct,
    asyncBudgetPct,
    memoryBudgetPct,
    mutationBudgetPct,
    replayBudgetPct,
    fairnessScore: Math.round(fairnessScore * 1000) / 1000,
  };
}

export function shouldEmergencyBudgetFreeze(fairnessScore: number, constitutionalRisk: number): boolean {
  return fairnessScore < 0.35 || constitutionalRisk >= 0.75;
}
