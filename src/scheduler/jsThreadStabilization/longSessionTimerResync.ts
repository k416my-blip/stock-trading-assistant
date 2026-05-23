import { JS_LONG_SESSION_RESYNC_MS } from '../../constants/jsThreadSchedulerStabilization';
import { resetSchedulerDriftTrackerForTest } from './schedulerDriftTracker';
import { resetMonotonicClockReconciliationForTest } from './monotonicClockReconciliation';

let sessionStart = 0;
let lastResync = 0;

export function resetLongSessionTimerResyncForTest(): void {
  sessionStart = Date.now();
  lastResync = sessionStart;
}

export function noteLongSessionStart(now = Date.now()): void {
  sessionStart = now;
  lastResync = now;
}

export function maybeResyncLongSessionTimers(now = Date.now()): boolean {
  if (now - lastResync < JS_LONG_SESSION_RESYNC_MS) return false;
  lastResync = now;
  resetSchedulerDriftTrackerForTest();
  resetMonotonicClockReconciliationForTest();
  return true;
}

export function longSessionElapsedMs(now = Date.now()): number {
  return sessionStart > 0 ? now - sessionStart : 0;
}
