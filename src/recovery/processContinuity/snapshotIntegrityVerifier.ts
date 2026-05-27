import { PROCESS_CONTINUITY_INTEGRITY_WARN } from '../../constants/processContinuityRecovery';
import { getLatestRuntimeSnapshot } from './persistentRuntimeSnapshotCoordinator';

export function verifySnapshotIntegrity(corruptionRisk: number): number {
  const latest = getLatestRuntimeSnapshot();
  let score = latest ? 0.92 : 0.75;
  score -= Math.min(0.5, corruptionRisk * 0.6);
  if (score < PROCESS_CONTINUITY_INTEGRITY_WARN) score = PROCESS_CONTINUITY_INTEGRITY_WARN * 0.9;
  return Math.round(score * 1000) / 1000;
}

export function resetSnapshotIntegrityVerifierForTest(): void {
  /* stateless */
}
