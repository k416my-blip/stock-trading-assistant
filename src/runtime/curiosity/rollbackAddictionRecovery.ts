/**
 * Rollback Addiction Recovery — sandbox alternatives when rollback-dependent.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { evaluateRollbackDependency } from '../evolution/rollbackDependencyGuard';
import { runDeterministicSandboxReplay } from './sandboxEvolutionReplay';

export function assessRollbackAddictionRisk(
  store: AdaptiveRuntimeLearningState,
  driftScore: number,
): number {
  const dep = evaluateRollbackDependency(store, driftScore);
  let risk = dep.rollbackPenalty;
  if (dep.recoveryAddiction) risk = Math.min(1, risk + 0.35);
  if (dep.rollbackOveruse) risk = Math.min(1, risk + 0.25);
  return Math.round(risk * 1000) / 1000;
}

export function runRollbackAddictionRecovery(
  store: AdaptiveRuntimeLearningState,
  driftScore: number,
  seed: number,
): { actionsJa: string[] } {
  const dep = evaluateRollbackDependency(store, driftScore);
  const actionsJa: string[] = [];
  if (!dep.recoveryAddiction && !dep.rollbackOveruse) return { actionsJa };

  const replay = runDeterministicSandboxReplay(seed, 'rollback addiction alt recovery');
  if (replay.archived) actionsJa.push('sandbox_alt_recovery_replay');
  return { actionsJa };
}
