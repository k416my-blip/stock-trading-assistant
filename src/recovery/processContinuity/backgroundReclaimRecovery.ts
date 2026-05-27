import type { ProcessContinuityObserveInput } from '../../types/processContinuityRecovery';

let reclaimStartedAt = 0;

export function resetBackgroundReclaimRecoveryForTest(): void {
  reclaimStartedAt = 0;
}

export function trackBackgroundReclaim(input: ProcessContinuityObserveInput, now = Date.now()): boolean {
  if (!input.appForeground || input.screenOff || input.miuiAggressiveReclaim) {
    if (!reclaimStartedAt) reclaimStartedAt = now;
    return true;
  }
  reclaimStartedAt = 0;
  return false;
}

export function shouldDelayHeavyHydration(reclaimActive: boolean): boolean {
  return reclaimActive;
}

export function isBackgroundReclaimActive(): boolean {
  return reclaimStartedAt > 0;
}
