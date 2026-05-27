const scores: number[] = [];

export function resetStabilityTrendPredictorForTest(): void {
  scores.length = 0;
}

export function noteStabilityScore(score: number): void {
  scores.push(score);
  if (scores.length > 32) scores.shift();
}

export function getSurvivabilityTrend(): number {
  if (scores.length < 2) return 0;
  const recent = scores.slice(-5);
  const older = scores.slice(0, Math.max(1, scores.length - 5));
  const r = recent.reduce((a, b) => a + b, 0) / recent.length;
  const o = older.reduce((a, b) => a + b, 0) / older.length;
  return Math.round((r - o) * 10) / 10;
}

export function getAdaptationConsistency(): number {
  if (scores.length < 3) return 1;
  let variance = 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  for (const s of scores) variance += (s - mean) ** 2;
  variance /= scores.length;
  return Math.round(Math.max(0, 1 - variance / 800) * 1000) / 1000;
}
