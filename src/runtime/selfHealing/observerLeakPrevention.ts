/**
 * Observer leak prevention — dedupe subscriptions and cap lifecycle listeners.
 */
import type { ObserverLeakPreventionResult } from '../../types/runtimeSelfHealing';
import {
  noteOrphanSubscription,
  getMemoryGuardianStats,
} from '../orchestrator/memoryPressureGuardian';
import { getHydrationLockState } from '../stability/hydrationLock';

const subscriptionKeys = new Map<string, number>();
const MAX_LISTENERS_PER_KEY = 2;
const MAX_HYDRATION_LISTENERS = 4;

let duplicateRemoved = 0;
let staleDetached = 0;
let dashboardCapped = 0;
let hydrationPruned = 0;

export function resetObserverLeakPreventionForTest(): void {
  subscriptionKeys.clear();
  duplicateRemoved = 0;
  staleDetached = 0;
  dashboardCapped = 0;
  hydrationPruned = 0;
}

export function registerObserverSubscription(key: string): boolean {
  const count = (subscriptionKeys.get(key) ?? 0) + 1;
  subscriptionKeys.set(key, count);
  if (count > MAX_LISTENERS_PER_KEY) {
    noteOrphanSubscription();
    return false;
  }
  return true;
}

export function runObserverLeakPrevention(observerAccumulation: number): ObserverLeakPreventionResult {
  let duplicateSubscriptionsRemoved = 0;
  for (const [key, count] of subscriptionKeys.entries()) {
    if (count > MAX_LISTENERS_PER_KEY) {
      subscriptionKeys.set(key, MAX_LISTENERS_PER_KEY);
      duplicateSubscriptionsRemoved += count - MAX_LISTENERS_PER_KEY;
    }
  }
  duplicateRemoved += duplicateSubscriptionsRemoved;

  const stats = getMemoryGuardianStats();
  const staleListenersDetached =
    observerAccumulation >= 6 ? Math.min(observerAccumulation, stats.orphanSubscriptions) : 0;
  staleDetached += staleListenersDetached;

  let dashboardObserversCapped = 0;
  if (observerAccumulation >= 10) {
    dashboardObserversCapped = Math.min(4, observerAccumulation - 6);
    dashboardCapped += dashboardObserversCapped;
  }

  const hyd = getHydrationLockState();
  let hydrationListenersPruned = 0;
  if (hyd.overlapCount > MAX_HYDRATION_LISTENERS) {
    hydrationListenersPruned = hyd.overlapCount - MAX_HYDRATION_LISTENERS;
    hydrationPruned += hydrationListenersPruned;
  }

  return {
    duplicateSubscriptionsRemoved,
    staleListenersDetached,
    dashboardObserversCapped,
    hydrationListenersPruned,
  };
}

export function getObserverLeakStats(): {
  duplicateRemoved: number;
  staleDetached: number;
  dashboardCapped: number;
  hydrationPruned: number;
} {
  return { duplicateRemoved, staleDetached, dashboardCapped, hydrationPruned };
}
