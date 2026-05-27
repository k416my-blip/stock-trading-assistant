import type { ProcessContinuityProfile } from '../../types/processContinuityRecovery';

export function computeContinuityScore(
  partial: Pick<
    ProcessContinuityProfile,
    | 'snapshotIntegrityScore'
    | 'processDeathRecoveryRate'
    | 'resurrectionConsistency'
    | 'replayRecoverySuccess'
    | 'crashLoopRisk'
    | 'persistenceCorruptionRisk'
    | 'staleHydrationRisk'
  >,
): number {
  let score = 100;
  score -= Math.round((1 - partial.snapshotIntegrityScore) * 25);
  score -= Math.round((1 - partial.processDeathRecoveryRate) * 20);
  score -= Math.round((1 - partial.resurrectionConsistency) * 15);
  score -= Math.round((1 - partial.replayRecoverySuccess) * 10);
  score -= Math.round(partial.crashLoopRisk * 20);
  score -= Math.round(partial.persistenceCorruptionRisk * 12);
  score -= Math.round(partial.staleHydrationRisk * 10);
  return Math.max(0, Math.min(100, score));
}

export function attachContinuityScore(
  profile: Omit<ProcessContinuityProfile, 'continuityScore'>,
): ProcessContinuityProfile {
  return { ...profile, continuityScore: computeContinuityScore(profile) };
}
