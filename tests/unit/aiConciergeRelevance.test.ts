import { describe, expect, it } from 'vitest';
import {
  applyRelevanceContextFilter,
  detectResponseScope,
  mergeRelevanceMemory,
  userRequestsExpansion,
} from '../../src/services/aiConciergeRelevance';
import { resolveConciergeConversationMode } from '../../src/services/aiConciergeConversationMode';
import { createEmptyConciergeSessionMemory } from '../../src/services/aiConciergeSessionMemory';
import { classifyConciergeResponseIntent } from '../../src/services/aiConciergeResponseIntent';

describe('aiConciergeRelevance', () => {
  it('detects held-only sell scope from explicit Japanese constraint', () => {
    const scope = detectResponseScope('売却検討は保有株だけ。1155をどう見る？');
    expect(scope.heldSymbolsOnly).toBe(true);
    expect(scope.suppressNonHeldTickers).toBe(true);
    expect(scope.suppressQueueUnlessAsked).toBe(true);
  });

  it('filters non-held recommendations when held-only sell scope applies', () => {
    const memory = mergeRelevanceMemory(
      createEmptyConciergeSessionMemory('general'),
      '売却検討は保有株だけ',
    );
    const filtered = applyRelevanceContextFilter({
      holdings: [
        {
          symbol: '1155',
          market: 'MY',
          shares: 100,
          priceSource: 'twelve',
          isStale: false,
          quoteAgeSeconds: 30,
          hasPrice: true,
        },
      ],
      watchlist: [
        { symbol: '1155', market: 'MY', side: 'watch' },
        { symbol: 'NVDA', market: 'US', side: 'watch' },
      ],
      recentRecommendations: [
        {
          ticker: '1155',
          action: 'reduce',
          urgency: 'medium',
          confidence: 0.7,
          rationale: 'trim',
        },
        {
          ticker: 'NVDA',
          action: 'reduce',
          urgency: 'low',
          confidence: 0.5,
          rationale: 'old candidate',
        },
      ],
      sessionMemory: memory,
      userMessage: '売却検討は保有株だけ。今どうする？',
      conversationMode: 'conversation',
    });

    expect(filtered.recentRecommendations.map((r) => r.ticker)).toEqual(['1155']);
    expect(filtered.watchlist.map((w) => w.symbol)).toEqual(['1155']);
    expect(filtered.control.filteredOutTickers).toContain('NVDA');
    expect(filtered.control.compactMode).toBe(true);
  });

  it('enables expansion only on explicit user phrases', () => {
    expect(userRequestsExpansion('なぜ？')).toBe(true);
    expect(userRequestsExpansion('分析して')).toBe(true);
    expect(userRequestsExpansion('なぜ買い推奨？')).toBe(false);
    expect(userRequestsExpansion('1155はどう？')).toBe(false);

    const intent = classifyConciergeResponseIntent('売却の理由は詳しく');
    expect(
      resolveConciergeConversationMode({
        intent,
        userMessage: '売却の理由は詳しく',
        degradedMode: false,
        staleHoldingsCount: 0,
      }),
    ).toBe('elaboration');
  });

  it('records suppressed themes and avoids resurfacing in memory merge', () => {
    const memory = mergeRelevanceMemory(
      createEmptyConciergeSessionMemory('general'),
      'その警告はもういい。繰り返さないで',
    );
    expect(memory.dismissedSignals.length).toBeGreaterThan(0);
    expect(memory.ignoredTopics.length).toBeGreaterThan(0);
  });

  it('defaults to compact conversation mode without expansion cue', () => {
    const intent = classifyConciergeResponseIntent('保有の売却タイミングは？');
    const mode = resolveConciergeConversationMode({
      intent,
      userMessage: '保有の売却タイミングは？',
      degradedMode: true,
      staleHoldingsCount: 2,
      apiHealthDegraded: true,
    });
    expect(mode).toBe('conversation');
  });
});
