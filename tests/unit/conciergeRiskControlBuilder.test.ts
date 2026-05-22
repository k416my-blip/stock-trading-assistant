import { describe, expect, it } from 'vitest';
import { CONFIDENCE_GATE_MIN_PCT } from '../../src/constants/aiRiskControl';
import { buildConciergeActionGuide } from '../../src/services/conciergeActionGuideBuilder';
import {
  buildConciergeRiskControl,
  crossValidateSymbolEvidence,
} from '../../src/services/conciergeRiskControlBuilder';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

function mockSym(overrides: Partial<ConciergeSymbolEvidence> = {}): ConciergeSymbolEvidence {
  return {
    symbol: 'AAPL',
    companyName: 'Apple',
    market: 'us',
    displayLabelJa: 'AAPL',
    currentPrice: 100,
    previousClose: 105,
    intradayChangePct: -6,
    volume: 1_000_000,
    volumeSurgeRatio: 3.2,
    quoteAgeSeconds: 120,
    quoteIsStale: false,
    portfolioHolding: null,
    latestFinancialNews: [{ title: 'Earnings miss', sentiment: 'ネガティブ', sourceTier: 'major_news' }],
    newsSummaryJa: 'ネガ',
    newsSource: 'News API',
    xSentiment: {
      postCount: 10,
      bullishPct: 10,
      bearishPct: 75,
      panicPct: 30,
      hypePct: 5,
      trendWords: ['loss'],
      postSurgeRatePct: 50,
      summaryJa: 'bearish',
      analysisBasis: 'fetched_posts',
      fromCache: true,
    },
    trendingKeywords: [],
    unusualActivityFlags: [{ id: 'sharp_drop_5pct', labelJa: '急落' }],
    dataGapsJa: [],
    ...overrides,
  };
}

describe('conciergeRiskControlBuilder', () => {
  it('cross-validates with 2+ families for strong warning', () => {
    const cv = crossValidateSymbolEvidence(mockSym());
    expect(cv.familyCount).toBeGreaterThanOrEqual(2);
    expect(cv.strongWarningAllowed).toBe(true);
  });

  it('blocks speculative AI when confidence below gate', () => {
    const ev = {
      generatedAt: new Date().toISOString(),
      analysisMode: 'balanced' as const,
      symbols: [mockSym({ intradayChangePct: null, volumeSurgeRatio: null, xSentiment: null, latestFinancialNews: [] })],
      globalSummaryJa: 'test',
      cacheNotesJa: [],
    };
    const withGuide = { ...ev, actionGuide: buildConciergeActionGuide(ev) };
    const risk = buildConciergeRiskControl({ evidence: withGuide });
    expect(risk.overallConfidencePct).toBeLessThan(CONFIDENCE_GATE_MIN_PCT);
    expect(risk.allowSpeculativeAi).toBe(false);
    expect(risk.analysisBlockedJa).toContain('分析不能');
  });

  it('x-only stress does not allow strong warning alone', () => {
    const cv = crossValidateSymbolEvidence(
      mockSym({
        intradayChangePct: -0.5,
        volumeSurgeRatio: 1.1,
        latestFinancialNews: [],
        unusualActivityFlags: [],
      }),
    );
    expect(cv.strongWarningAllowed).toBe(false);
  });
});
