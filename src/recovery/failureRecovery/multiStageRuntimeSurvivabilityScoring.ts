import type { FailureRecoveryProfile } from '../../types/failureRecoveryOrchestrator';

export function computeContinuousRecoveryScore(
  partial: Pick<
    FailureRecoveryProfile,
    | 'recoverySuccessRate'
    | 'networkChaosScore'
    | 'runtimeQuarantineDuration'
    | 'selfHealingEfficiency'
    | 'memoryCompactionEfficiency'
  >,
): number {
  let score = 100;
  score -= Math.round(partial.networkChaosScore * 25);
  score -= Math.min(20, Math.floor(partial.runtimeQuarantineDuration / 60_000));
  score -= Math.round((1 - partial.recoverySuccessRate) * 30);
  score -= Math.round((1 - partial.selfHealingEfficiency) * 15);
  score -= Math.round((1 - partial.memoryCompactionEfficiency) * 10);
  return Math.max(0, Math.min(100, score));
}

export function attachContinuousRecoveryScore(
  profile: Omit<FailureRecoveryProfile, 'continuousRecoveryScore'>,
): FailureRecoveryProfile {
  return {
    ...profile,
    continuousRecoveryScore: computeContinuousRecoveryScore(profile),
  };
}
