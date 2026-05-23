/**
 * Zombie task cleaner — orphan async, timers, orchestration, hydration, websocket workers.
 */
import type { ZombieCleanupResult } from '../../types/runtimeSelfHealing';
import { cancelAsyncTasksByLabel, compactStalePriorityQueue } from '../orchestrator/asyncPriorityScheduler';
import { cleanupDuplicateTimers } from '../../services/mobileRedmiRuntime';
import {
  noteStaleTimerDetected,
  getMemoryGuardianStats,
} from '../orchestrator/memoryPressureGuardian';
import { releaseHydrationLock, getHydrationLockState } from '../stability/hydrationLock';
import { setHydrationRestorePhase } from '../stability/hydrationReconnectGate';

let lastZombieSweepAt = 0;
let totalZombiesCleared = 0;

export function resetZombieTaskCleanerForTest(): void {
  lastZombieSweepAt = 0;
  totalZombiesCleared = 0;
}

export function runZombieTaskCleanup(signals: {
  queueStagnationMs: number;
  observerAccumulation: number;
  hydrationResidueCount: number;
}): ZombieCleanupResult {
  const now = Date.now();
  let orphanAsyncAborted = 0;
  orphanAsyncAborted += cancelAsyncTasksByLabel('orphan-');
  orphanAsyncAborted += cancelAsyncTasksByLabel('stale-');
  orphanAsyncAborted += cancelAsyncTasksByLabel('abandoned-');

  const queuePurged =
    signals.queueStagnationMs >= 240
      ? compactStalePriorityQueue(signals.queueStagnationMs > 400 ? 45_000 : 90_000)
      : 0;

  cleanupDuplicateTimers();
  noteStaleTimerDetected();
  const timersCancelled = getMemoryGuardianStats().staleTimers > 0 ? 1 : 0;

  let orchestrationAbandoned = 0;
  if (signals.queueStagnationMs >= 480) {
    orchestrationAbandoned += cancelAsyncTasksByLabel('orch-');
  }

  let hydrationTasksCleared = 0;
  const hyd = getHydrationLockState();
  if (signals.hydrationResidueCount > 0 && hyd.active && now - hyd.since > 120_000) {
    releaseHydrationLock();
    setHydrationRestorePhase('idle');
    hydrationTasksCleared = 1;
  }

  let websocketWorkersReset = 0;
  if (signals.observerAccumulation >= 8) {
    websocketWorkersReset += cancelAsyncTasksByLabel('ws-');
  }

  const total =
    orphanAsyncAborted +
    queuePurged +
    timersCancelled +
    orchestrationAbandoned +
    hydrationTasksCleared +
    websocketWorkersReset;
  totalZombiesCleared += total;
  lastZombieSweepAt = now;

  return {
    orphanAsyncAborted,
    queuePurged,
    timersCancelled,
    orchestrationAbandoned,
    hydrationTasksCleared,
    websocketWorkersReset,
  };
}

export function getTotalZombiesCleared(): number {
  return totalZombiesCleared;
}

export function getLastZombieSweepAt(): number {
  return lastZombieSweepAt;
}
