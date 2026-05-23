let recoveryStarted = 0;
let lastRecoveryMs = 0;

export function resetFreezeSafeSchedulerRecoveryForTest(): void {
  recoveryStarted = 0;
  lastRecoveryMs = 0;
}

export function beginFreezeRecovery(now = Date.now()): void {
  recoveryStarted = now;
}

export function completeFreezeRecovery(now = Date.now()): number {
  if (recoveryStarted === 0) return 0;
  lastRecoveryMs = now - recoveryStarted;
  recoveryStarted = 0;
  return lastRecoveryMs;
}

export function getSchedulerRecoveryLatency(): number {
  return lastRecoveryMs;
}
