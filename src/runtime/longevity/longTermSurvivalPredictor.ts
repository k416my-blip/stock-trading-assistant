export function predictLongTermSurvival(input: {
  entropyHealth: number;
  civilizationRisk: number;
  fossilRisk: number;
  heapEcology: number;
  immunity: number;
}): number {
  const score =
    input.entropyHealth / 100 * 0.3 +
    (1 - input.civilizationRisk) * 0.2 +
    (1 - input.fossilRisk) * 0.2 +
    input.heapEcology * 0.15 +
    input.immunity * 0.15;
  return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
}
