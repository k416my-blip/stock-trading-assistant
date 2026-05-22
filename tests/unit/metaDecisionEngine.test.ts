import { describe, expect, it } from 'vitest';
import { buildMetaDecisionBundle } from '../../src/services/metaDecisionEngine';
import { defaultMetaDecisionState } from '../../src/services/metaDecisionStorage';
import type { ProactiveSuggestionCandidate } from '../../src/types/proactiveSuggestion';

function candidate(
  overrides: Partial<ProactiveSuggestionCandidate> = {},
): ProactiveSuggestionCandidate {
  return {
    priority: 'medium',
    category: 'sharp_move',
    dedupeKey: 'test:medium:SYM',
    titleJa: 'テスト',
    bodyJa: 'body',
    actionHintJa: 'hint',
    source: 'test',
    ...overrides,
  };
}

describe('metaDecisionEngine', () => {
  it('merges duplicate groups', () => {
    const bundle = buildMetaDecisionBundle(
      {
        candidates: [
          candidate({ dedupeKey: 'a', symbol: '1155', priority: 'high', titleJa: '急落A' }),
          candidate({ dedupeKey: 'b', symbol: '1155', category: 'sharp_move', titleJa: '出来高' }),
        ],
        regimeId: 'sideways',
        marketRiskScore: 40,
        fearScore: 30,
        emergencyMode: false,
        symbolWeightPct: { '1155': 25 },
        userStyleId: 'balanced_trader',
        evidenceBySymbol: {},
      },
      defaultMetaDecisionState(),
    );
    expect(bundle.mergedCount).toBeGreaterThanOrEqual(1);
  });

  it('suppresses routine signals during panic regime', () => {
    const bundle = buildMetaDecisionBundle(
      {
        candidates: [
          candidate({
            priority: 'medium',
            category: 'buy_candidate',
            dedupeKey: 'buy',
            titleJa: '買い候補',
          }),
        ],
        regimeId: 'panic',
        marketRiskScore: 90,
        fearScore: 80,
        emergencyMode: false,
        symbolWeightPct: {},
        userStyleId: 'balanced_trader',
        evidenceBySymbol: {},
      },
      defaultMetaDecisionState(),
    );
    expect(bundle.suppressedCount).toBeGreaterThanOrEqual(1);
  });

  it('produces top 3 curated priorities with whyImportant', () => {
    const bundle = buildMetaDecisionBundle(
      {
        candidates: [
          candidate({
            priority: 'critical',
            symbol: '1155',
            notificationWhyJa: '複合シグナル 3件',
            dedupeKey: 'c1',
          }),
          candidate({ priority: 'high', symbol: 'AAPL', dedupeKey: 'c2', titleJa: '高' }),
          candidate({ priority: 'high', symbol: 'NVDA', dedupeKey: 'c3', titleJa: '高2' }),
          candidate({
            priority: 'high',
            category: 'buy_candidate',
            actionCategory: 'opportunity',
            dedupeKey: 'c4',
            titleJa: '機会',
          }),
        ],
        regimeId: 'bullish',
        marketRiskScore: 35,
        fearScore: 20,
        emergencyMode: false,
        symbolWeightPct: { '1155': 40, AAPL: 10 },
        userStyleId: 'short_term',
        evidenceBySymbol: {
          '1155': { intradayChangePct: 3, bearishPct: 60, bullishPct: 30 },
        },
      },
      defaultMetaDecisionState(),
    );
    expect(bundle.topPriorities.length).toBeLessThanOrEqual(3);
    for (const p of bundle.topPriorities) {
      expect(p.whyImportantJa.length).toBeGreaterThan(5);
    }
    expect(bundle.executiveSummary.marketJa).toContain('bullish');
  });
});
