import { describe, expect, it } from 'vitest';
import { ACTION_NEGATIVE_BEARISH_PCT, ACTION_VOLUME_SURGE_RATIO } from '../../src/constants/aiActionGuide';
import { buildConciergeActionGuide, buildSymbolActionGuide } from '../../src/services/conciergeActionGuideBuilder';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

function mockSym(overrides: Partial<ConciergeSymbolEvidence> = {}): ConciergeSymbolEvidence {
  return {
    symbol: '7103',
    companyName: 'Spritzer',
    market: 'bursa',
    displayLabelJa: '7103・マレーシア（Spritzer）',
    currentPrice: 1.5,
    previousClose: 1.6,
    intradayChangePct: -6,
    volume: 100000,
    volumeSurgeRatio: 3.2,
    quoteAgeSeconds: 60,
    quoteIsStale: false,
    portfolioHolding: null,
    latestFinancialNews: [{ title: 'Earnings miss', sentiment: 'ネガティブ' }],
    newsSummaryJa: 'neg',
    newsSource: 'rss',
    xSentiment: {
      postCount: 20,
      bullishPct: 10,
      bearishPct: 75,
      panicPct: 20,
      hypePct: 5,
      trendWords: ['loss'],
      postSurgeRatePct: 50,
      summaryJa: 'neg',
      analysisBasis: 'fetched_posts',
      fromCache: true,
    },
    trendingKeywords: [],
    unusualActivityFlags: [],
    dataGapsJa: [],
    ...overrides,
  };
}

describe('conciergeActionGuideBuilder', () => {
  it('classifies panic and rumor on sharp drop + volume 3x + bear 70%', () => {
    const guide = buildSymbolActionGuide(mockSym());
    expect(guide.categories).toContain('panic');
    expect(guide.categories).toContain('unusual-volume');
    expect(guide.categories).toContain('rumor-alert');
    expect(guide.marketStance).toBe('bearish');
    expect(guide.confidencePct).toBeGreaterThan(0);
    expect(guide.recommendedActionsJa.length).toBeGreaterThan(0);
    expect(guide.notificationPriority).toBe('critical');
    expect(guide.notificationWhyJa).toContain('なぜ通知したか');
  });

  it('marks insufficient data when gaps dominate', () => {
    const guide = buildSymbolActionGuide(
      mockSym({
        currentPrice: null,
        intradayChangePct: null,
        volumeSurgeRatio: null,
        latestFinancialNews: [],
        xSentiment: null,
        dataGapsJa: ['a', 'b', 'c'],
      }),
    );
    expect(guide.insufficientData).toBe(true);
    expect(guide.insufficientDataLabelJa).toBe('判断材料不足');
  });

  it('builds bundle with overall confidence', () => {
    const ev = {
      generatedAt: new Date().toISOString(),
      analysisMode: 'balanced' as const,
      symbols: [mockSym()],
      globalSummaryJa: '1銘柄',
      cacheNotesJa: [],
    };
    const bundle = buildConciergeActionGuide(ev);
    expect(bundle.overallConfidencePct).toBeGreaterThan(0);
    expect(bundle.aggregatedRecommendationsJa.length).toBeGreaterThan(0);
  });

  it('uses 3x volume and 70% bear thresholds', () => {
    expect(ACTION_VOLUME_SURGE_RATIO).toBe(3);
    expect(ACTION_NEGATIVE_BEARISH_PCT).toBe(70);
  });
});
