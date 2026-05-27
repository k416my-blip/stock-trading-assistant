export function scoreRecoveryConfidence(
  recoveryEfficiency: number,
  continuityScore: number,
): number {
  return Math.round(((recoveryEfficiency * 0.55 + continuityScore / 100 * 0.45)) * 1000) / 1000;
}

export function resetRecoveryConfidenceScorerForTest(): void {
  /* stateless */
}
