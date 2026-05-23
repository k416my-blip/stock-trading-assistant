import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetHydrationLockForTest,
  tryAcquireHydrationLock,
  releaseHydrationLock,
  getHydrationOverlapCount,
} from '../../../src/runtime/stability/hydrationLock';

describe('hydrationLock', () => {
  beforeEach(() => {
    resetHydrationLockForTest();
  });

  it('blocks overlapping hydration', () => {
    expect(tryAcquireHydrationLock('a')).toBe(true);
    expect(tryAcquireHydrationLock('b')).toBe(false);
    expect(getHydrationOverlapCount()).toBe(1);
    releaseHydrationLock();
    expect(tryAcquireHydrationLock('b')).toBe(true);
  });
});
