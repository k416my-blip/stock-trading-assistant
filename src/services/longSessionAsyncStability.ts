import {
  EXTENDED_SESSION_ASYNC_MINUTES,
  LONG_SESSION_ASYNC_MINUTES,
} from '../constants/asyncRuntimeCoordinator';
import { getSessionMinutes } from './longSessionStability';

export type LongSessionAsyncPolicy = {
  pruneLowPriorityQueue: boolean;
  cancelIdleOnly: boolean;
  batchExplanations: boolean;
  orchestrationSimplified: boolean;
  idleOnlyDeepAnalysis: boolean;
  memoryGraphPartial: boolean;
  dashboardMinimalRefresh: boolean;
};

export function resolveLongSessionAsyncPolicy(now = Date.now()): LongSessionAsyncPolicy {
  const minutes = getSessionMinutes(now);
  const base: LongSessionAsyncPolicy = {
    pruneLowPriorityQueue: false,
    cancelIdleOnly: false,
    batchExplanations: false,
    orchestrationSimplified: false,
    idleOnlyDeepAnalysis: false,
    memoryGraphPartial: false,
    dashboardMinimalRefresh: false,
  };

  if (minutes < LONG_SESSION_ASYNC_MINUTES) return base;

  const mid: LongSessionAsyncPolicy = {
    ...base,
    pruneLowPriorityQueue: true,
    cancelIdleOnly: true,
    batchExplanations: true,
    orchestrationSimplified: true,
  };

  if (minutes < EXTENDED_SESSION_ASYNC_MINUTES) return mid;

  return {
    ...mid,
    idleOnlyDeepAnalysis: true,
    memoryGraphPartial: true,
    dashboardMinimalRefresh: true,
  };
}
