import { reconcileMonotonicNow } from './monotonicClockReconciliation';

export function driftSafeReplayTimestamp(): string {
  return new Date(reconcileMonotonicNow()).toISOString();
}

export function driftSafeReplayOffsetMs(baseAt: number): number {
  return reconcileMonotonicNow() - baseAt;
}
