import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/mobileRedmiRuntime', () => ({
  isCacheFirstModeActive: () => false,
  initMobileRedmiRuntime: vi.fn(),
  markHydrationComplete: vi.fn(),
  scheduleDedupedTimer: (_k: string, fn: () => void, _d: number) => {
    fn();
  },
}));
import {
  evaluateAsyncRuntime,
  getCoordinatorQueueDepth,
  resetAsyncRuntimeCoordinatorForTest,
  runCoordinatedTask,
} from '../../src/services/asyncRuntimeCoordinator';
import { resetAsyncBudgetForTest } from '../../src/services/asyncBudgetSystem';
import { resetLongSessionStabilityForTest, markSessionStart } from '../../src/services/longSessionStability';
import { resetDashboardFrameStabilizerForTest } from '../../src/services/dashboardFrameStabilizer';

describe('asyncRuntimeCoordinator', () => {
  beforeEach(() => {
    resetAsyncRuntimeCoordinatorForTest();
    resetAsyncBudgetForTest();
    resetLongSessionStabilityForTest();
    resetDashboardFrameStabilizerForTest();
    markSessionStart();
  });

  it('evaluates EVENTLOOP_OK when idle', () => {
    const ev = evaluateAsyncRuntime({
      cascadePressure: 10,
      renderBurstRate: 2,
      queueSize: 5,
      memoryPressure: false,
      batterySaver: false,
      appForeground: true,
      sessionMinutes: 5,
    });
    expect(ev.state).toBe('EVENTLOOP_OK');
    expect(ev.metrics.asyncQueueDepth).toBe(0);
  });

  it('escalates under saturation signals', () => {
    const ev = evaluateAsyncRuntime({
      cascadePressure: 80,
      renderBurstRate: 18,
      queueSize: 90,
      memoryPressure: true,
      batterySaver: true,
      appForeground: false,
      sessionMinutes: 45,
    });
    expect(['EVENTLOOP_BUSY', 'EVENTLOOP_SATURATED', 'EVENTLOOP_CRITICAL']).toContain(ev.state);
    expect(ev.compactDashboardMode).toBe(true);
  });

  it('runs coordinated tasks and drains queue', async () => {
    let ran = false;
    await runCoordinatedTask('metrics', 'NORMAL', 'test-task', async () => {
      ran = true;
    });
    expect(ran).toBe(true);
    await new Promise((r) => setTimeout(r, 30));
    expect(getCoordinatorQueueDepth()).toBeLessThanOrEqual(1);
  });
});
