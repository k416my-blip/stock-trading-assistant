import type { FailureRecoveryObserveInput } from '../../types/failureRecoveryOrchestrator';
import { deescalateRecovery, escalateRecovery } from './recoveryEscalationLadder';

let passes = 0;
let successes = 0;

export function resetAdaptiveSelfHealingCoordinatorForTest(): void {
  passes = 0;
  successes = 0;
}

export function coordinateSelfHealingPass(
  input: FailureRecoveryObserveInput,
  severity: number,
  recovered: boolean,
): number {
  passes += 1;
  if (recovered) {
    successes += 1;
    deescalateRecovery();
  } else {
    escalateRecovery(severity);
  }
  if (input.miuiAggressiveReclaim && !input.appForeground) {
    escalateRecovery(0.6);
  }
  return getSelfHealingEfficiency();
}

export function getSelfHealingEfficiency(): number {
  if (passes === 0) return 1;
  return Math.round((successes / passes) * 100) / 100;
}

export function getRecoverySuccessRate(): number {
  return getSelfHealingEfficiency();
}
