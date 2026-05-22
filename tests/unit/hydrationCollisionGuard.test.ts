import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/mobileRedmiRuntime', () => ({
  markHydrationComplete: vi.fn(),
  scheduleDedupedTimer: (_k: string, fn: () => void) => fn(),
}));
import {
  beginHydrationPauseWindow,
  isOrchestrationPausedForHydration,
  resetHydrationCollisionGuardForTest,
  runSerializedHydration,
} from '../../src/services/hydrationCollisionGuard';
import { resetAsyncBudgetForTest } from '../../src/services/asyncBudgetSystem';

describe('hydrationCollisionGuard', () => {
  beforeEach(() => {
    resetHydrationCollisionGuardForTest();
    resetAsyncBudgetForTest();
  });

  it('pauses orchestration during hydration window', () => {
    beginHydrationPauseWindow();
    expect(isOrchestrationPausedForHydration()).toBe(true);
  });

  it('serializes duplicate hydration keys', async () => {
    let count = 0;
    const first = await runSerializedHydration('resume', async () => {
      count += 1;
    });
    const second = await runSerializedHydration('resume', async () => {
      count += 1;
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(count).toBe(1);
  });
});
