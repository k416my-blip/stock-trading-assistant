/**
 * curiosityHealth = clamp(0,100, weighted formula)
 */
export function computeCuriosityHealth(input: {
  diversityRetention: number;
  innovationScore: number;
  minorityEdgeHealth: number;
  dormantRevivalHealth: number;
  entropyBalance: number;
  replayMonocultureRisk: number;
  fossilizationRisk: number;
}): number {
  const raw =
    35 * input.diversityRetention +
    20 * input.innovationScore +
    15 * input.minorityEdgeHealth +
    10 * input.dormantRevivalHealth +
    10 * input.entropyBalance +
    10 * (1 - input.replayMonocultureRisk) -
    10 * input.fossilizationRisk;
  return Math.round(Math.max(0, Math.min(100, raw)));
}
