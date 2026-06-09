import { describe, expect, it } from 'vitest';
import { buildLiteTradeCandidates, buildPortfolioScoreBreakdown } from '../../src/services/actionCenterInsights';
import type { PortfolioAiEvaluationBundle } from '../../src/types/portfolioAiEvaluation';
import type { StrategyExecutionBundle } from '../../src/types/strategyExecution';

function mockBundle(source: 'openai' | 'cache' | 'mock_fallback' | 'skipped' = 'openai'): StrategyExecutionBundle {
  return {
    generatedAt: new Date().toISOString(),
    tacticalMode: 'balanced',
    regimeId: 'unknown',
    regimeStrategyJa: 'test',
    todayRecommendations: [],
    dangerAvoid: [],
    watchList: [],
    highExpectancy: [],
    opportunities: [],
    threats: [],
    allocation: {
      sectorBalanceJa: '',
      concentrationJa: '',
      recommendedCashRatioPct: 20,
      cashRatioRationaleJa: '',
    },
    overallConfidencePct: 50,
    macroNotes: [],
    learningFeedbackJa: [],
    predictionAccuracyJa: null,
    backtest: null,
    journalRecent: [],
    cooldownActive: false,
    cooldownNoteJa: null,
    hybridSecondEvaluator: {
      generatedAt: new Date().toISOString(),
      source,
      symbolCount: 2,
      ruleWeightPct: 70,
      aiWeightPct: 30,
    },
  };
}

function mockPortfolio(): PortfolioAiEvaluationBundle {
  return {
    generatedAt: new Date().toISOString(),
    evaluatedAtJa: '6/1 11:00',
    portfolioScore: 44,
    holdingCount: 2,
    batchSource: 'hybrid',
    rankedHoldings: [
      {
        rank: 1,
        symbol: 'AAA',
        displayLabelJa: 'AAA Inc',
        action: 'buy',
        confidence: 68,
        rsi14: 32,
        rsiSource: 'yahoo_finance',
        rationaleJa: 'RSIが低下。ニュース中立。利益率良好。',
        finalScore: 78,
        ruleScore: 70,
        aiScore: 84,
        displayTone: 'buy',
        dataSources: { quote: 'TwelveData', rsi: 'Yahoo', news: 'NewsAPI', x: null },
        weightPct: 70,
      },
      {
        rank: 2,
        symbol: 'BBB',
        displayLabelJa: 'BBB Corp',
        action: 'reduce',
        confidence: 64,
        rsi14: 74,
        rsiSource: 'yahoo_finance',
        rationaleJa: '上値が重く、ニュース悪化。',
        finalScore: 34,
        ruleScore: 45,
        aiScore: 20,
        displayTone: 'sell',
        dataSources: { quote: 'Yahoo', rsi: 'Yahoo', news: 'NewsAPI', x: null },
        weightPct: 30,
      },
    ],
    bestToday: [],
    worstToday: [],
    riskWarnings: [],
  };
}

describe('actionCenterInsights', () => {
  it('builds buy/sell candidates with dataSource labels', () => {
    const result = buildLiteTradeCandidates({
      portfolio: mockPortfolio(),
      bundle: mockBundle('openai'),
    });
    expect(result.buyCandidates[0]?.symbol).toBe('AAA');
    expect(result.sellCandidates[0]?.symbol).toBe('BBB');
    expect(result.buyCandidates[0]?.dataSource).toContain('OpenAI');
    expect(result.buyCandidates[0]?.dataSource).toContain('TwelveData');
  });

  it('keeps breakdown total equal to portfolio score', () => {
    const breakdown = buildPortfolioScoreBreakdown({
      portfolio: mockPortfolio(),
      holdings: [
        {
          id: '1',
          symbol: 'AAA',
          market: 'us',
          currency: 'USD',
          shares: 10,
          averageBuyPrice: 100,
          currentPrice: 108,
          openedAt: new Date().toISOString(),
        },
        {
          id: '2',
          symbol: 'BBB',
          market: 'us',
          currency: 'USD',
          shares: 10,
          averageBuyPrice: 100,
          currentPrice: 92,
          openedAt: new Date().toISOString(),
        },
      ],
    });
    const total =
      50 + breakdown.profitability + breakdown.rsi + breakdown.news + breakdown.concentrationRisk;
    expect(total).toBe(44);
    expect(breakdown.total).toBe(44);
  });
});
