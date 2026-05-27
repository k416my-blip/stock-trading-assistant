const trend: number[] = [];

export function resetBackgroundStarvationPredictorForTest(): void {
  trend.length = 0;
}

export function noteStarvationSample(risk: number): void {
  trend.push(risk);
  if (trend.length > 24) trend.shift();
}

export function getStarvationRiskTrend(): number {
  if (trend.length < 2) return trend[0] ?? 0;
  const recent = trend.slice(-6);
  const older = trend.slice(0, Math.max(1, trend.length - 6));
  const rAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const oAvg = older.reduce((a, b) => a + b, 0) / older.length;
  return Math.round(Math.max(0, rAvg - oAvg) * 1000) / 1000;
}

export function predictStarvationRisk(
  appForeground: boolean,
  screenOff: boolean,
  miuiReclaim: boolean,
): number {
  let risk = 0;
  if (!appForeground) risk += 0.35;
  if (screenOff) risk += 0.25;
  if (miuiReclaim) risk += 0.3;
  return Math.min(1, risk);
}
