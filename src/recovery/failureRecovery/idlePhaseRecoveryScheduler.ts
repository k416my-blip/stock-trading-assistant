import { FAILURE_IDLE_RECOVERY_MS } from '../../constants/failureRecoveryOrchestrator';

let idleScheduledAt = 0;
let idleFired = false;

export function resetIdlePhaseRecoverySchedulerForTest(): void {
  idleScheduledAt = 0;
  idleFired = false;
}

export function scheduleIdleRecovery(now = Date.now()): void {
  if (!idleScheduledAt) idleScheduledAt = now + FAILURE_IDLE_RECOVERY_MS;
}

export function tickIdleRecovery(now = Date.now()): boolean {
  if (!idleScheduledAt || now < idleScheduledAt) return false;
  idleFired = true;
  idleScheduledAt = 0;
  return true;
}

export function wasIdleRecoveryFired(): boolean {
  return idleFired;
}

export function resetIdleRecoveryFlag(): void {
  idleFired = false;
}
