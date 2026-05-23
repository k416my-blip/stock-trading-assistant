import { FAILURE_FREEZE_LAG_MS } from '../../constants/failureRecoveryOrchestrator';

let freezeStartedAt = 0;
let lastRecoveryLatency = 0;
let recoveryCount = 0;

export function resetFreezeAutoRecoveryTrackerForTest(): void {
  freezeStartedAt = 0;
  lastRecoveryLatency = 0;
  recoveryCount = 0;
}

export function detectFreeze(eventLoopLagMs: number, now = Date.now()): boolean {
  if (eventLoopLagMs >= FAILURE_FREEZE_LAG_MS) {
    if (!freezeStartedAt) freezeStartedAt = now;
    return true;
  }
  if (freezeStartedAt) {
    lastRecoveryLatency = now - freezeStartedAt;
    recoveryCount += 1;
    freezeStartedAt = 0;
  }
  return false;
}

export function getFreezeRecoveryLatency(): number {
  return lastRecoveryLatency;
}

export function getFreezeRecoveryCount(): number {
  return recoveryCount;
}
