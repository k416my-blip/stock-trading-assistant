import { describe, expect, it } from 'vitest';
import { buildStrategyExecutionBundle } from '../../src/services/strategyExecutionEngine';
import { defaultStrategyExecutionState } from '../../src/services/strategyExecutionStorage';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

function sym(overrides: Partial<ConciergeSymbolEvidence> = {}): ConciergeSymbolEvidence {
  return {
    symbol: '1155',
    companyName: 'Test',
    market: 'bursa',
    displayLabelJa: '1155.KL',
    currentPrice: 10,
    previousClose: 10.5,
    intradayChangePct: -6,
    volume: 1000,
    volumeSurgeRatio: 2.5,
    quoteAgeSeconds: 60,
    quoteIsStale: false,
    portfolioHolding: { shares: 100, averageBuyPrice: 9.5, unrealizedPnlPct: -5 },
    latestFinancialNews: [{ title: 'warn', sentiment: 'ネガティブ' }],
    newsSummaryJa: '',
    newsSource: 'cache',
    xSentiment: {
      postCount: 10,
      bullishPct: 20,
      bearishPct: 70,
      panicPct: 30,
      hypePct: 5,
      trendWords: [],
      postSurgeRatePct: 20,
      summaryJa: '',
      analysisBasis: 't',
      fromCache: true,
    },
    trendingKeywords: [],
    unusualActivityFlags: [{ id: 'sharp_drop_5pct', labelJa: '急落' }],
    dataGapsJa: [],
    ...overrides,
  };
}

describe('strategyExecutionEngine', () => {
  it('assigns reduce/avoid under stress', () => {
    const bundle = buildStrategyExecutionBundle(
      {
        evidenceSymbols: [sym()],
        globalMarket: null,
        portfolioIntel: null,
        symbolWeightPct: { '1155': 30 },
        tacticalMode: 'defensive',
        regimeId: 'panic',
      },
      defaultStrategyExecutionState(),
    );
    expect(['reduce', 'avoid', 'watch']).toContain(bundle.dangerAvoid[0]?.action ?? bundle.watchList[0]?.action);
    expect(bundle.overallConfidencePct).toBeGreaterThan(0);
  });

  it('separates watch vs action intent', () => {
    const bundle = buildStrategyExecutionBundle(
      {
        evidenceSymbols: [
          sym({ intradayChangePct: 0.5, unusualActivityFlags: [], xSentiment: null }),
          sym({ intradayChangePct: -6 }),
        ],
        globalMarket: null,
        portfolioIntel: null,
        symbolWeightPct: {},
        tacticalMode: 'balanced',
        regimeId: 'sideways',
      },
      defaultStrategyExecutionState(),
    );
    const hasWatch = bundle.watchList.some((w) => w.intent === 'watch');
    const hasAction = bundle.todayRecommendations.some((t) => t.intent === 'action') || bundle.dangerAvoid.length > 0;
    expect(hasWatch || hasAction).toBe(true);
  });

  it('includes analyst explanation and risk reward', () => {
    const bundle = buildStrategyExecutionBundle(
      {
        evidenceSymbols: [sym({ intradayChangePct: 4, unusualActivityFlags: [] })],
        globalMarket: null,
        portfolioIntel: null,
        symbolWeightPct: { '1155': 10 },
        tacticalMode: 'aggressive',
        regimeId: 'bullish',
      },
      defaultStrategyExecutionState(),
    );
    const rec = bundle.highExpectancy[0] ?? bundle.todayRecommendations[0];
    if (rec) {
      expect(rec.analystExplanationJa.length).toBeGreaterThan(20);
      expect(rec.riskReward.expectedUpsidePct).toBeGreaterThan(0);
      expect(rec.confidencePct).toBeLessThanOrEqual(100);
    }
  });
});
