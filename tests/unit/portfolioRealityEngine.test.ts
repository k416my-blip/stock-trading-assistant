import { describe, expect, it } from 'vitest';
import { buildPortfolioRealityBundle } from '../../src/services/portfolioRealityEngine';
import { defaultRealityState } from '../../src/services/portfolioRealityStorage';
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
    portfolioHolding: null,
    latestFinancialNews: [],
    newsSummaryJa: '',
    newsSource: 'cache',
    xSentiment: null,
    trendingKeywords: [],
    unusualActivityFlags: [{ id: 'sharp_drop_5pct', labelJa: '急落' }],
    dataGapsJa: [],
    ...overrides,
  };
}

describe('portfolioRealityEngine', () => {
  it('records recommendations and computes trust score', () => {
    const strategy = buildStrategyExecutionBundle(
      {
        evidenceSymbols: [sym()],
        globalMarket: null,
        portfolioIntel: null,
        symbolWeightPct: { '1155': 20 },
        tacticalMode: 'balanced',
        regimeId: 'panic',
      },
      defaultStrategyExecutionState(),
    );
    const { bundle } = buildPortfolioRealityBundle(defaultRealityState(), {
      strategyBundle: strategy,
      regimeId: 'panic',
      globalMarket: null,
      priceBySymbol: { '1155': 10 },
    });
    expect(bundle.trustScore).toBeGreaterThanOrEqual(0);
    expect(bundle.trustScore).toBeLessThanOrEqual(100);
    expect(bundle.dashboard.pendingCount).toBeGreaterThanOrEqual(0);
  });

  it('flags thin reasons as human review', () => {
    const state = defaultRealityState();
    state.recommendations.push({
      id: 'r1',
      createdAt: new Date().toISOString(),
      symbol: 'TEST',
      market: 'bursa',
      action: 'buy',
      confidencePct: 40,
      calibratedConfidencePct: 40,
      baselinePrice: 1,
      whyJa: 'short',
      regimeId: 'sideways',
      status: 'active',
      horizon: '1d',
      resolvedAt: null,
      returnPct: null,
      benchmarkId: 'klci',
      benchmarkReturnPct: null,
      benchmarkDeltaPct: null,
      thinReasonFlag: true,
      humanReviewOnly: true,
      failureNoteJa: null,
    });
    const { bundle } = buildPortfolioRealityBundle(state, {
      strategyBundle: null,
      regimeId: 'sideways',
      globalMarket: null,
      priceBySymbol: { TEST: 1 },
    });
    expect(bundle.humanReviewQueue.length).toBeGreaterThan(0);
  });

  it('detects buy-reduce flip consistency warning', () => {
    const now = Date.now();
    const state = defaultRealityState();
    state.recommendations = [
      {
        id: 'a',
        createdAt: new Date(now - 3600000).toISOString(),
        symbol: 'ABC',
        market: 'bursa',
        action: 'buy',
        confidencePct: 70,
        calibratedConfidencePct: 70,
        baselinePrice: 5,
        whyJa: '十分な根拠テキストで説明しています。',
        regimeId: 'bullish',
        status: 'active',
        horizon: '1w',
        resolvedAt: null,
        returnPct: null,
        benchmarkId: 'klci',
        benchmarkReturnPct: null,
        benchmarkDeltaPct: null,
        thinReasonFlag: false,
        humanReviewOnly: false,
        failureNoteJa: null,
      },
      {
        id: 'b',
        createdAt: new Date(now - 1800000).toISOString(),
        symbol: 'ABC',
        market: 'bursa',
        action: 'reduce',
        confidencePct: 72,
        calibratedConfidencePct: 72,
        baselinePrice: 5,
        whyJa: '十分な根拠テキストで説明しています。',
        regimeId: 'bullish',
        status: 'active',
        horizon: '1w',
        resolvedAt: null,
        returnPct: null,
        benchmarkId: 'klci',
        benchmarkReturnPct: null,
        benchmarkDeltaPct: null,
        thinReasonFlag: false,
        humanReviewOnly: false,
        failureNoteJa: null,
      },
    ];
    const { bundle } = buildPortfolioRealityBundle(state, {
      strategyBundle: null,
      regimeId: 'bullish',
      globalMarket: null,
      priceBySymbol: { ABC: 5 },
    });
    expect(bundle.consistencyWarningsJa.length).toBeGreaterThan(0);
  });
});
