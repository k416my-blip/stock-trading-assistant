import { PROCESS_CONTINUITY_HYDRATION_OVERLAP_WARN } from '../../constants/processContinuityRecovery';

let hydrationStartedAt = 0;
let lastHydrationRecoveryMs = 0;

export function resetSafeHydrationRecoveryFlowForTest(): void {
  hydrationStartedAt = 0;
  lastHydrationRecoveryMs = 0;
}

export function beginHydrationRecovery(now = Date.now()): void {
  if (!hydrationStartedAt) hydrationStartedAt = now;
}

export function completeHydrationRecovery(now = Date.now()): number {
  if (!hydrationStartedAt) return 0;
  lastHydrationRecoveryMs = now - hydrationStartedAt;
  hydrationStartedAt = 0;
  return lastHydrationRecoveryMs;
}

export function getHydrationRecoveryMs(): number {
  return lastHydrationRecoveryMs;
}

export function computeStaleHydrationRisk(
  hydrationLockActive: boolean,
  overlapCount: number,
): number {
  if (!hydrationLockActive && overlapCount === 0) return 0;
  const overlap = Math.min(1, overlapCount / (PROCESS_CONTINUITY_HYDRATION_OVERLAP_WARN * 2));
  const lock = hydrationLockActive ? 0.35 : 0;
  return Math.round(Math.max(overlap, lock) * 1000) / 1000;
}
