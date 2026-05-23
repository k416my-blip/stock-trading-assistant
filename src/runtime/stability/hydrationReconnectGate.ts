import { isHydrationLockActive } from './hydrationLock';

export type HydrationRestorePhase =
  | 'idle'
  | 'hydrating'
  | 'restore_pending'
  | 'reconnect_scheduled';

let phase: HydrationRestorePhase = 'idle';

export function resetHydrationReconnectGateForTest(): void {
  phase = 'idle';
}

export function getHydrationRestorePhase(): HydrationRestorePhase {
  return phase;
}

export function setHydrationRestorePhase(next: HydrationRestorePhase): void {
  phase = next;
}

export function isReconnectPausedForHydration(): boolean {
  return isHydrationLockActive() || phase === 'hydrating';
}

export function canScheduleWebsocketRestoreNow(): boolean {
  return !isReconnectPausedForHydration() && phase !== 'hydrating';
}
