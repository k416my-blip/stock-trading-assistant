import { describe, expect, it } from 'vitest';
import {
  mapProactiveCategoryToAlertType,
  proactivePushCooldownMs,
  shouldDeliverProactivePush,
} from '../../src/services/notification-engine';
import type { ProactiveSuggestion } from '../../src/types/proactiveSuggestion';

function suggestion(partial: Partial<ProactiveSuggestion>): ProactiveSuggestion {
  return {
    id: 'ps-1',
    priority: 'high',
    category: 'take_profit_near',
    dedupeKey: '4707:take_profit_near:high',
    titleJa: '利確',
    bodyJa: '参考',
    actionHintJa: '確認',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending',
    source: 'test',
    ...partial,
  };
}

describe('notification-engine', () => {
  it('maps categories to alert types', () => {
    expect(mapProactiveCategoryToAlertType('stop_loss_near')).toBe('stop_loss_near');
    expect(mapProactiveCategoryToAlertType('rsi_signal')).toBeNull();
  });

  it('enforces push cooldown by priority', () => {
    const now = 1_000_000;
    const key = '4707:take_profit_near:high';
    const high = suggestion({ priority: 'high', dedupeKey: key });
    expect(shouldDeliverProactivePush(high, {}, now)).toBe(true);
    expect(shouldDeliverProactivePush(high, { [key]: now - 10 * 60 * 1000 }, now)).toBe(false);
    expect(
      shouldDeliverProactivePush(high, { [key]: now - proactivePushCooldownMs('high') - 1 }, now),
    ).toBe(true);
  });

  it('skips low priority push', () => {
    const low = suggestion({ priority: 'low', category: 'periodic_check' });
    expect(shouldDeliverProactivePush(low, {}, Date.now())).toBe(false);
  });
});
