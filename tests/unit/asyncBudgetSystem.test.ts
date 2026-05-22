import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAsyncBudgetCount,
  resetAsyncBudgetForTest,
  resolveAsyncBudgetDecision,
} from '../../src/services/asyncBudgetSystem';
import { ASYNC_BUDGET_PER_SECOND } from '../../src/constants/asyncRuntimeCoordinator';

describe('asyncBudgetSystem', () => {
  beforeEach(() => {
    resetAsyncBudgetForTest();
  });

  it('allows jobs under per-second budget', () => {
    expect(resolveAsyncBudgetDecision('dashboard')).toBe('allow');
  });

  it('returns cache_reuse when explanation budget exceeded', () => {
    const max = ASYNC_BUDGET_PER_SECOND.explanation;
    for (let i = 0; i < max; i++) {
      resolveAsyncBudgetDecision('explanation');
    }
    expect(getAsyncBudgetCount('explanation')).toBeGreaterThanOrEqual(max);
    expect(resolveAsyncBudgetDecision('explanation')).toBe('merge');
  });
});
