import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/websocketStabilityGuard', () => ({
  scheduleWebsocketReconnectWithJitter: vi.fn(),
}));

import {
  resetReconnectCoordinatorForTest,
  requestReconnectSchedule,
  isResumeReconnectGated,
} from '../../../src/runtime/stability/reconnectCoordinator';
import { resetHydrationLockForTest, tryAcquireHydrationLock } from '../../../src/runtime/stability/hydrationLock';
import { setHydrationRestorePhase } from '../../../src/runtime/stability/hydrationReconnectGate';

describe('reconnectCoordinator', () => {
  beforeEach(() => {
    resetReconnectCoordinatorForTest();
    resetHydrationLockForTest();
    setHydrationRestorePhase('idle');
  });

  it('blocks reconnect during hydration lock', () => {
    tryAcquireHydrationLock('x');
    setHydrationRestorePhase('hydrating');
    const r = requestReconnectSchedule(1000, 5000, 'test');
    expect(r.scheduled).toBe(false);
    expect(isResumeReconnectGated()).toBe(true);
  });
});
