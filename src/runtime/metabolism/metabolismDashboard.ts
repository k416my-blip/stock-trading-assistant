/**
 * Metabolism Dashboard aggregation.
 */
import type { MetabolismDashboard } from '../../types/runtimeMetabolism';
import type { MetabolismGcMode } from '../../types/runtimeMetabolism';

export function buildMetabolismDashboard(input: {
  metabolicHealth: number;
  memoryNutritionScore: number;
  obsoleteReplayCount: number;
  staleEdgeCount: number;
  buriedGraphNodes: number;
  replayCemeterySize: number;
  entropyDetoxScore: number;
  fossilizedRollbackRisk: number;
  selfHealingAddictionRisk: number;
  runtimeCalorieUsed: number;
  heapEcologyScore: number;
  toxicMemoryCount: number;
  lastGcAt: string | null;
  nextGcReason: string;
  gcMode: MetabolismGcMode;
}): MetabolismDashboard {
  return { ...input };
}
