import { describe, expect, it, beforeEach } from 'vitest';
import {
  canFireCrossLayerTrigger,
  getTriggerCountInWindow,
  resetCrossLayerTriggerBudgetForTest,
  resolveTriggerBudgetDecision,
} from '../../src/services/crossLayerTriggerBudget';
import { TRIGGER_BUDGET_PER_MINUTE } from '../../src/constants/crossLayerCascade';

describe('crossLayerTriggerBudget', () => {
  beforeEach(() => {
    resetCrossLayerTriggerBudgetForTest();
  });

  it('allows triggers under budget', () => {
    expect(resolveTriggerBudgetDecision('orchestration_rebuild')).toBe('allow');
    expect(getTriggerCountInWindow('orchestration_rebuild')).toBe(1);
  });

  it('blocks when per-minute budget exceeded', () => {
    const max = TRIGGER_BUDGET_PER_MINUTE.explanation_regeneration;
    for (let i = 0; i < max; i++) {
      expect(resolveTriggerBudgetDecision('explanation_regeneration')).toBe('allow');
    }
    expect(canFireCrossLayerTrigger('explanation_regeneration')).toBe(false);
    expect(resolveTriggerBudgetDecision('explanation_regeneration')).toBe('cache_reuse');
  });
});
