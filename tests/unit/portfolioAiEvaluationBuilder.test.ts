import { describe, expect, it } from 'vitest';
import { buildPortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationBuilder';
import type { AiSecondEvaluatorSymbolInput } from '../../src/types/aiSecondEvaluator';

describe('buildPortfolioAiEvaluation', () => {
  it('ranks all holdings and computes portfolio score', () => {
    const enrichedInputs: AiSecondEvaluatorSymbolInput[] = [
      {
        symbol: '0820EA',
        market: 'bursa',
        displayLabelJa: '0820EA',
        currentPrice: 1.85,
        portfolioHolding: { shares: 100, averageBuyPrice: 1.7, unrealizedPnlPct: 5 },
        rsi14: 32,
        rsiSource: 'yahoo_finance',
        priceHistoryBars: 120,
        volume: 1,
        volumeSurgeRatio: 1,
        newsSummaryJa: '中立',
        newsHeadlines: [],
        newsCount: 1,
        newsSource: 'Yahoo Finance RSS',
        newsApiCount: 0,
        newsApiTitles: [],
        xSentimentSummaryJa: '中立',
        xBullishPct: 0,
        xBearishPct: 0,
        xPostCount: 0,
        xSentimentDisplay: null,
        xFetchSource: 'skipped',
        volumeSource: 'evidence',
        quoteSource: 'yahoo_finance',
        priceAgeSeconds: 60,
        quoteIsStale: false,
      },
      {
        symbol: '1155',
        market: 'bursa',
        displayLabelJa: '1155',
        currentPrice: 10,
        portfolioHolding: { shares: 50, averageBuyPrice: 9, unrealizedPnlPct: 2 },
        rsi14: 68,
        rsiSource: 'yahoo_finance',
        priceHistoryBars: 120,
        volume: 1,
        volumeSurgeRatio: 1,
        newsSummaryJa: '中立',
        newsHeadlines: [],
        newsCount: 0,
        newsSource: 'News',
        newsApiCount: 0,
        newsApiTitles: [],
        xSentimentSummaryJa: '中立',
        xBullishPct: 0,
        xBearishPct: 0,
        xPostCount: 0,
        xSentimentDisplay: null,
        xFetchSource: 'x_cache',
        volumeSource: 'evidence',
        quoteSource: 'yahoo_finance',
        priceAgeSeconds: 60,
        quoteIsStale: false,
      },
    ];

    const batch = {
      symbols: [
        { symbol: '0820EA', action: 'hold' as const, confidence: 60, rationaleJa: 'RSI低め' },
        { symbol: '1155', action: 'reduce' as const, confidence: 55, rationaleJa: 'RSI高め' },
      ],
      source: 'openai' as const,
      fetchedAt: '2026-05-29T10:00:00.000Z',
    };

    const result = buildPortfolioAiEvaluation({
      enrichedInputs,
      batch,
      ruleScoresBySymbol: { '0820EA': 50, '1155': 40 },
      symbolWeightPct: { '0820EA': 60, '1155': 40 },
    });

    expect(result.holdingCount).toBe(2);
    expect(result.rankedHoldings).toHaveLength(2);
    expect(result.bestToday).toHaveLength(2);
    expect(result.portfolioScore).toBeGreaterThanOrEqual(0);
    expect(result.portfolioScore).toBeLessThanOrEqual(100);
    expect(result.rankedHoldings[0].rank).toBe(1);
    expect(result.riskWarnings.length).toBeGreaterThanOrEqual(1);
  });
});
