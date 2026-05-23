import { FAILURE_BACKGROUND_RESTORE_MS } from '../../constants/failureRecoveryOrchestrator';

let starvationStartedAt = 0;
let lastRecoveryMs = 0;

export function resetBackgroundStarvationRecoveryForTest(): void {
  starvationStartedAt = 0;
  lastRecoveryMs = 0;
}

export function trackBackgroundStarvation(
  appForeground: boolean,
  screenOff: boolean,
  now = Date.now(),
): boolean {
  if (!appForeground || screenOff) {
    if (!starvationStartedAt) starvationStartedAt = now;
    return true;
  }
  if (starvationStartedAt) {
    lastRecoveryMs = now - starvationStartedAt;
    starvationStartedAt = 0;
  }
  return false;
}

export function getBackgroundRecoveryMs(): number {
  return lastRecoveryMs || FAILURE_BACKGROUND_RESTORE_MS;
}

export function shouldDelayForegroundRestore(starvationActive: boolean): boolean {
  return starvationActive;
}
