/**
 * Rollback Dependency Guard — overuse, masking, recovery addiction.
 */
import type { RollbackDependencyMetrics } from '../../types/runtimeEvolution';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import {
  ROLLBACK_COOLDOWN_MS,
  ROLLBACK_OVERUSE_COUNT,
  ROLLBACK_PENALTY_INCREMENT,
} from '../../constants/runtimeEvolution';
import { getRollbackFrequency, getRollbackSnapshots } from '../governance/adaptiveRollbackSystem';

let lastRollbackAt = 0;
let rollbackPenalty = 0;
let relearningPhase = false;

export function resetRollbackDependencyGuardForTest(): void {
  lastRollbackAt = 0;
  rollbackPenalty = 0;
  relearningPhase = false;
}

export function evaluateRollbackDependency(
  store: AdaptiveRuntimeLearningState,
  driftScore: number,
  nowMs = Date.now(),
): RollbackDependencyMetrics {
  const freq = getRollbackFrequency();
  const snaps = getRollbackSnapshots().filter((s) => !s.isBaseline);
  const rollbackOveruse = freq >= ROLLBACK_OVERUSE_COUNT;
  const cooldownActive = nowMs - lastRollbackAt < ROLLBACK_COOLDOWN_MS;

  const rollbackMasking = rollbackOveruse && driftScore < 0.4;
  const stabilityIllusion = rollbackOveruse && store.replayCount > 3 && driftScore < 0.35;
  const recoveryAddiction =
    Object.values(store.recovery).filter((r) => r.attempts > 5 && r.successRate > 0.85).length >= 2;

  if (rollbackOveruse) {
    rollbackPenalty = Math.min(0.6, rollbackPenalty + ROLLBACK_PENALTY_INCREMENT);
    relearningPhase = true;
  }

  return {
    rollbackOveruse,
    rollbackMasking,
    stabilityIllusion,
    recoveryAddiction,
    rollbackPenalty: Math.round(rollbackPenalty * 1000) / 1000,
    cooldownActive: cooldownActive || rollbackOveruse,
  };
}

export function noteRollbackOccurred(nowMs = Date.now()): void {
  lastRollbackAt = nowMs;
}

export function shouldSuppressRollback(): boolean {
  return rollbackPenalty >= 0.35 || Date.now() - lastRollbackAt < ROLLBACK_COOLDOWN_MS;
}

export function isRelearningPhaseActive(): boolean {
  return relearningPhase;
}

export function clearRelearningPhase(): void {
  relearningPhase = false;
  rollbackPenalty = Math.max(0, rollbackPenalty - 0.1);
}
