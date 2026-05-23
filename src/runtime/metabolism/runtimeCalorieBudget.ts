/**
 * Runtime Calorie Budget — per-layer compute cost accounting.
 */
import type { RuntimeLayerId } from '../../types/runtimeConstitution';
import { CALORIE_BUDGET_PER_TICK } from '../../constants/runtimeMetabolism';
import { collectLayerPressures } from '../constitution/runtimeConstitutionCoordinator';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

export type LayerCalorieUsage = Record<RuntimeLayerId, number>;

let caloriesUsedThisTick = 0;

export function resetCalorieBudgetForTest(): void {
  caloriesUsedThisTick = 0;
}

export function allocateLayerCalories(metrics: RuntimeTelemetryMetricsSnapshot): LayerCalorieUsage {
  const pressures = collectLayerPressures(metrics);
  const totalPressure = Object.values(pressures).reduce((a, b) => a + b, 0) || 1;
  const usage = {} as LayerCalorieUsage;
  let sum = 0;
  for (const [layer, p] of Object.entries(pressures) as [RuntimeLayerId, number][]) {
    const c = Math.round((p / totalPressure) * CALORIE_BUDGET_PER_TICK);
    usage[layer] = c;
    sum += c;
  }
  caloriesUsedThisTick = sum;
  return usage;
}

export function getRuntimeCalorieUsed(): number {
  return caloriesUsedThisTick;
}

/** runtimeCalorie = Σ(layerPressure × layerQuota) scaled to budget */
export function computeRuntimeCalorieFormula(metrics: RuntimeTelemetryMetricsSnapshot): number {
  const usage = allocateLayerCalories(metrics);
  return Object.values(usage).reduce((a, b) => a + b, 0);
}
