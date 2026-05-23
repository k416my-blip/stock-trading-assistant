let lockActive = false;
let overlapCount = 0;
let hydrationKey: string | null = null;
let lockSince = 0;
let wsMutationBlocked = 0;
let dashboardUpdateBlocked = 0;

export function resetHydrationLockForTest(): void {
  lockActive = false;
  overlapCount = 0;
  hydrationKey = null;
  lockSince = 0;
  wsMutationBlocked = 0;
  dashboardUpdateBlocked = 0;
}

export function tryAcquireHydrationLock(key: string, at = Date.now()): boolean {
  if (lockActive) {
    overlapCount += 1;
    return false;
  }
  lockActive = true;
  hydrationKey = key;
  lockSince = at;
  return true;
}

export function releaseHydrationLock(): void {
  lockActive = false;
  hydrationKey = null;
}

export function isHydrationLockActive(): boolean {
  return lockActive;
}

export function getHydrationOverlapCount(): number {
  return overlapCount;
}

export function noteHydrationWsMutationBlocked(): void {
  if (lockActive) wsMutationBlocked += 1;
}

export function noteHydrationDashboardUpdateBlocked(): void {
  if (lockActive) dashboardUpdateBlocked += 1;
}

export function shouldBlockWsMutationDuringHydration(): boolean {
  if (!lockActive) return false;
  wsMutationBlocked += 1;
  return true;
}

export function getHydrationLockState(): {
  active: boolean;
  key: string | null;
  since: number;
  overlapCount: number;
  wsMutationBlocked: number;
  dashboardUpdateBlocked: number;
} {
  return {
    active: lockActive,
    key: hydrationKey,
    since: lockSince,
    overlapCount,
    wsMutationBlocked,
    dashboardUpdateBlocked,
  };
}
