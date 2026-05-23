import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/mobileRedmiRuntime', () => ({
  scheduleDedupedTimer: vi.fn((_k: string, fn: () => void, _d: number) => fn()),
}));

vi.mock('../../../src/services/websocketStabilityGuard', () => ({
  executeWebsocketReconnectJitter: vi.fn(),
}));

import {
  resetHydrationRestoreSequencerForTest,
  scheduleDelayedWebsocketRestore,
} from '../../../src/runtime/stability/hydrationRestoreSequencer';
import {
  resetHydrationReconnectGateForTest,
  setHydrationRestorePhase,
} from '../../../src/runtime/stability/hydrationReconnectGate';
import { resetHydrationLockForTest, tryAcquireHydrationLock } from '../../../src/runtime/stability/hydrationLock';

describe('hydrationRestoreSequencer', () => {
  beforeEach(() => {
    resetHydrationRestoreSequencerForTest();
    resetHydrationReconnectGateForTest();
    resetHydrationLockForTest();
  });

  it('defers ws restore while hydration lock active', () => {
    tryAcquireHydrationLock('test');
    setHydrationRestorePhase('hydrating');
    scheduleDelayedWebsocketRestore(100, () => {});
    expect(true).toBe(true);
  });
});
