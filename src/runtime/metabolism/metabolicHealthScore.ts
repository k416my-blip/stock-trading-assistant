/**
 * Metabolic Health Score 0–100
 *
 * metabolicHealth = clamp(0, 100,
 *   40 * memoryNutritionScore
 * + 25 * heapEcologyScore
 * + 15 * entropyDetoxScore
 * + 10 * (1 - fossilizedRollbackRisk)
 * + 10 * (1 - selfHealingAddictionRisk)
 * - 5 * min(1, tombstoneRatio)
 * )
 */
export function computeMetabolicHealth(input: {
  memoryNutritionScore: number;
  heapEcologyScore: number;
  entropyDetoxScore: number;
  fossilizedRollbackRisk: number;
  selfHealingAddictionRisk: number;
  tombstoneRatio: number;
}): number {
  const raw =
    40 * input.memoryNutritionScore +
    25 * input.heapEcologyScore +
    15 * input.entropyDetoxScore +
    10 * (1 - input.fossilizedRollbackRisk) +
    10 * (1 - input.selfHealingAddictionRisk) -
    5 * Math.min(1, input.tombstoneRatio);

  return Math.round(Math.max(0, Math.min(100, raw)));
}
