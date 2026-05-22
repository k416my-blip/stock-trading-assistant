import { describe, expect, it } from 'vitest';
import {
  buildProactiveDedupeKey,
  enqueueProactiveCandidates,
  hasUnhandledHigh,
  shouldSuppressCandidate,
} from '../../src/services/proactiveSuggestionQueue';
import type { ProactiveSuggestionCandidate } from '../../src/types/proactiveSuggestion';

const baseCandidate = (partial: Partial<ProactiveSuggestionCandidate>): ProactiveSuggestionCandidate => ({
  priority: 'medium',
  category: 'buy_candidate',
  dedupeKey: buildProactiveDedupeKey('buy_candidate', 'medium', 'AAPL'),
  titleJa: '購入候補があります',
  bodyJa: '参考情報として確認してください',
  actionHintJa: '確認が必要',
  source: 'test',
  ...partial,
});

describe('proactiveSuggestionQueue', () => {
  it('dedupes same key within suppress window', () => {
    const now = Date.now();
    const c = baseCandidate({});
    const first = enqueueProactiveCandidates([c], [], {}, now);
    expect(first.added).toHaveLength(1);
    const second = enqueueProactiveCandidates([c], first.suggestions, first.suppressUntil, now + 1000);
    expect(second.added).toHaveLength(0);
    expect(second.suppressed).toBe(1);
  });

  it('suppresses low when unhandled high exists', () => {
    const now = Date.now();
    const high = baseCandidate({
      priority: 'high',
      category: 'stop_loss_near',
      dedupeKey: buildProactiveDedupeKey('stop_loss_near', 'high', '7203'),
    });
    const low = baseCandidate({
      priority: 'low',
      category: 'periodic_check',
      dedupeKey: buildProactiveDedupeKey('periodic_check', 'low'),
    });
    const seeded = enqueueProactiveCandidates([high], [], {}, now);
    const blocked = shouldSuppressCandidate(low, now + 5000, seeded.suppressUntil, seeded.suggestions);
    expect(blocked).toBe(true);
    expect(hasUnhandledHigh(seeded.suggestions)).toBe(true);
  });
});
