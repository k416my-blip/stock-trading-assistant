/**
 * Resume → hydration → websocket restore ordering.
 */
import { scheduleDedupedTimer } from '../../services/mobileRedmiRuntime';
import {
  canScheduleWebsocketRestoreNow,
  setHydrationRestorePhase,
  type HydrationRestorePhase,
} from './hydrationReconnectGate';
import { requestReconnectSchedule } from './reconnectCoordinator';

export type { HydrationRestorePhase } from './hydrationReconnectGate';

let pendingRestore: { delayMs: number; onReady: () => void } | null = null;

export function resetHydrationRestoreSequencerForTest(): void {
  pendingRestore = null;
}

export { getHydrationRestorePhase } from './hydrationReconnectGate';

export function noteHydrationSequenceStart(): void {
  setHydrationRestorePhase('hydrating');
}

export function noteHydrationSequenceEnd(): void {
  setHydrationRestorePhase('restore_pending');
  flushPendingWebsocketRestore();
}

function flushPendingWebsocketRestore(): void {
  if (!pendingRestore || !canScheduleWebsocketRestoreNow()) return;
  const { delayMs, onReady } = pendingRestore;
  pendingRestore = null;
  scheduleDedupedTimer('hydration-ws-restore', () => {
    onReady();
    setHydrationRestorePhase('reconnect_scheduled');
    requestReconnectSchedule(2500, 10_000, 'post-hydration-restore', 'hydration_sequencer');
  }, delayMs);
}

export function scheduleDelayedWebsocketRestore(delayMs: number, onReady: () => void): void {
  if (!canScheduleWebsocketRestoreNow()) {
    pendingRestore = { delayMs, onReady };
    setHydrationRestorePhase('restore_pending');
    return;
  }
  scheduleDedupedTimer('hydration-ws-restore', () => {
    onReady();
    setHydrationRestorePhase('reconnect_scheduled');
    requestReconnectSchedule(2500, 10_000, 'hydration-ws-restore', 'hydration_sequencer');
  }, delayMs);
}
