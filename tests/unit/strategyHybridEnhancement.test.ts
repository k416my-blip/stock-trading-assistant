import { describe, expect, it } from 'vitest';
import { buildAiSecondEvaluatorInputs } from '../../src/services/aiSecondEvaluatorService';
import { enhanceStrategyBundleWithHybridEvaluator } from '../../src/services/strategyHybridEnhancement';
import { buildStrategyExecutionBundle } from '../../src/services/strategyExecutionEngine';
import { defaultStrategyExecutionState } from '../../src/services/strategyExecutionStorage';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

function sampleEvidence(symbol: string): ConciergeSymbolEvidence {
  return {
    symbol,
    companyName: symbol,
    market: 'us',
    displayLabelJa: symbol,
    currentPrice: 100,
    previousClose: 98,
    intradayChangePct: 2,
    volume: 1_000_000,
    volumeSurgeRatio: 1.2,
    quoteAgeSeconds: 60,
    quoteIsStale: false,
    portfolioHolding: { shares: 10, averageBuyPrice: 95, unrealizedPnlPct: 5 },
    latestFinancialNews: [{ title: 'Test news', sentiment: 'neutral' }],
    newsSummaryJa: 'ニュース要約',
    newsSource: 'cache',
    xSentiment: {
      postCount: 10,
      bullishPct: 55,
      bearishPct: 30,
      panicPct: 5,
      hypePct: 10,
      trendWords: [],
      postSurgeRatePct: null,
      summaryJa: 'Xセンチメント中立',
      analysisBasis: 'cache',
      fromCache: true,
    },
    trendingKeywords: [],
    unusualActivityFlags: [],
    dataGapsJa: [],
  };
}

describe('strategyHybridEnhancement', () => {
  it('adds hybrid scores without removing rule action', async () => {
    const evidence = [sampleEvidence('AAPL')];
    const base = buildStrategyExecutionBundle(
      {
        evidenceSymbols: evidence,
        globalMarket: null,
        portfolioIntel: null,
        symbolWeightPct: { AAPL: 20 },
        tacticalMode: 'balanced',
        regimeId: 'sideways',
      },
      defaultStrategyExecutionState(),
    );

    const ruleActionBefore =
      base.todayRecommendations[0]?.action ?? base.watchList[0]?.action;
    const enhanced = await enhanceStrategyBundleWithHybridEvaluator(base, evidence, {
      degradedMode: true,
    });

    expect(enhanced.hybridSecondEvaluator?.source).toBe('mock_fallback');
    const rec =
      enhanced.todayRecommendations.find((r) => r.symbol === 'AAPL') ??
      enhanced.watchList.find((r) => r.symbol === 'AAPL');
    expect(rec?.action).toBe(ruleActionBefore);
    expect(rec?.hybrid?.finalScore).toBeGreaterThan(0);
    expect(rec?.hybrid?.ruleScore).toBeGreaterThan(0);
    expect(rec?.hybrid?.aiScore).toBeGreaterThan(0);
    expect(rec?.fusedDisplayAction).toBeDefined();
  });

  it('buildAiSecondEvaluatorInputs includes RSI, news, and X metadata', () => {
    const inputs = buildAiSecondEvaluatorInputs([sampleEvidence('AAPL')]);
    expect(inputs[0]?.rsi14).toBeTypeOf('number');
    expect(inputs[0]?.newsCount).toBeGreaterThan(0);
    expect(inputs[0]?.newsSource).toBe('cache');
    expect(inputs[0]?.xPostCount).toBeGreaterThan(0);
    expect(inputs[0]?.xSentimentDisplay).toContain('X');
  });
});
