import { FAILURE_RECOVERY_ESCALATION_MAX } from '../../constants/failureRecoveryOrchestrator';

let level = 0;

export function resetRecoveryEscalationLadderForTest(): void {
  level = 0;
}

export function getRecoveryEscalationLevel(): number {
  return level;
}

export function escalateRecovery(severity: number): number {
  if (severity > 0.8) level = Math.min(FAILURE_RECOVERY_ESCALATION_MAX, level + 2);
  else if (severity > 0.5) level = Math.min(FAILURE_RECOVERY_ESCALATION_MAX, level + 1);
  return level;
}

export function deescalateRecovery(): number {
  level = Math.max(0, level - 1);
  return level;
}
