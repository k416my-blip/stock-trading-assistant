import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimeAsyncQueueTrackerForTest,
  observeAsyncQueue,
  isAsyncStarvation,
} from '../../../src/runtime/stability/asyncStarvationMonitor';
import {
  STABILITY_ASYNC_QUEUE_LAG_MS,
  STABILITY_ASYNC_STARVATION_QUEUE,
} from '../../../src/constants/runtimeStability';

describe('asyncStarvationMonitor', () => {
  beforeEach(() => {
    resetRuntimeAsyncQueueTrackerForTest();
  });

  it('detects starvation by queue depth', () => {
    observeAsyncQueue(50, 100);
    expect(isAsyncStarvation(STABILITY_ASYNC_STARVATION_QUEUE, STABILITY_ASYNC_QUEUE_LAG_MS)).toBe(true);
  });
});
