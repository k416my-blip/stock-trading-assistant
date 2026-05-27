import type { ProcessContinuityMode } from '../../types/processContinuityRecovery';

export function scoreColdStartSurvival(partial: {
  coldStartRecoveryMs: number;
  snapshotIntegrityScore: number;
  resurrectionConsistency: number;
  mode: ProcessContinuityMode;
}): number {
  let score = 100;
  if (partial.coldStartRecoveryMs > 8_000) score -= 15;
  if (partial.snapshotIntegrityScore < 0.7) score -= 20;
  if (partial.resurrectionConsistency < 0.65) score -= 18;
  if (partial.mode === 'crash_loop_minimal') score -= 25;
  if (partial.mode === 'corruption_quarantine') score -= 12;
  return Math.max(0, Math.min(100, score));
}

export function resetMultiStageColdStartSurvivabilityForTest(): void {
  /* stateless */
}
