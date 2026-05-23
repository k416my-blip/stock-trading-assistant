import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/websocketStabilityGuard', () => ({
  executeWebsocketReconnectJitter: vi.fn(),
}));

vi.mock('../../../src/services/asyncBudgetSystem', () => ({
  resolveAsyncBudgetDecision: vi.fn(() => 'allow'),
}));

import { executeWebsocketReconnectJitter } from '../../../src/services/websocketStabilityGuard';
import {
  getReconnectCoordinatorStateForTest,
  requestReconnectSchedule,
  resetReconnectCoordinatorForTest,
} from '../../../src/runtime/stability/reconnectCoordinator';
import {
  getReconnectTraceTimeline,
  resetReconnectSequenceTraceForTest,
} from '../../../src/runtime/stability/reconnectSequenceTrace';
import { resetHydrationLockForTest } from '../../../src/runtime/stability/hydrationLock';
import { setHydrationRestorePhase } from '../../../src/runtime/stability/hydrationReconnectGate';
import { resetRuntimeResumeCoordinatorForTest } from '../../../src/runtime/coordinator/resumeCoordinatorIntegration';

describe('reconnectEntryUnification', () => {
  beforeEach(() => {
    resetReconnectCoordinatorForTest();
    resetReconnectSequenceTraceForTest();
    resetHydrationLockForTest();
    resetRuntimeResumeCoordinatorForTest();
    setHydrationRestorePhase('idle');
    vi.mocked(executeWebsocketReconnectJitter).mockClear();
  });

  it('tags source and records timeline on schedule', () => {
    const r = requestReconnectSchedule(1000, 5000, 'test', 'kernel_policy');
    expect(r.scheduled).toBe(true);
    expect(r.source).toBe('kernel_policy');
    expect(executeWebsocketReconnectJitter).toHaveBeenCalledWith(
      1000,
      5000,
      expect.objectContaining({ source: 'kernel_policy' }),
    );
    const timeline = getReconnectTraceTimeline();
    expect(timeline.some((e) => e.phase === 'request' && e.source === 'kernel_policy')).toBe(true);
    expect(timeline.some((e) => e.phase === 'schedule')).toBe(true);
  });

  it('coalesces duplicate reconnect within window', () => {
    requestReconnectSchedule(1000, 5000, 'first', 'redmi_foreground');
    const second = requestReconnectSchedule(1000, 5000, 'second', 'redmi_foreground');
    expect(second.coalesced).toBe(true);
    expect(executeWebsocketReconnectJitter).toHaveBeenCalledTimes(1);
    expect(getReconnectTraceTimeline().some((e) => e.phase === 'coalesce')).toBe(true);
  });

  it('blocks during hydration pause without hidden retry timer', () => {
    setHydrationRestorePhase('hydrating');
    const r = requestReconnectSchedule(1000, 5000, 'blocked', 'hydration_sequencer');
    expect(r.scheduled).toBe(false);
    expect(executeWebsocketReconnectJitter).not.toHaveBeenCalled();
    expect(getReconnectCoordinatorStateForTest().pendingScheduleToken).toBeNull();
  });
});
