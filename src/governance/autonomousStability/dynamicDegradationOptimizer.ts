export function computeDegradationEfficiency(
  stabilityScore: number,
  overheadRatio: number,
): number {
  const base = stabilityScore / 100;
  const penalty = overheadRatio * 0.35;
  return Math.round(Math.max(0.2, Math.min(1, base - penalty)) * 1000) / 1000;
}

export function resetDynamicDegradationOptimizerForTest(): void {
  /* stateless */
}
