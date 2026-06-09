import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildAiDailyComment } from '../../src/services/aiDailyCommentBuilder';
import type { PortfolioAiEvaluationBundle } from '../../src/types/portfolioAiEvaluation';
import type { PortfolioPosition } from '../../src/types';

const portfolioEval: PortfolioAiEvaluationBundle = {
  generatedAt: new Date().toISOString(),
  evaluatedAtJa: 'test',
  portfolioScore: 51,
  holdingCount: 10,
  batchSource: 'hybrid',
  rankedHoldings: [
    {
      rank: 1,
      symbol: '0883',
      displayLabelJa: '0883・香港（CNOOC Limited）',
      action: 'buy',
      confidence: 80,
      rsi14: 50,
      rsiSource: 'yahoo_finance',
      rationaleJa: '候補',
      finalScore: 65,
      ruleScore: 50,
      aiScore: 80,
      displayTone: 'buy',
      dataSources: { quote: null, rsi: 'Yahoo', news: 'RSS', x: null },
      weightPct: 10,
    },
    {
      rank: 2,
      symbol: '0941',
      displayLabelJa: 'China Mobile',
      action: 'hold',
      confidence: 60,
      rsi14: 45,
      rsiSource: 'yahoo_finance',
      rationaleJa: '保有',
      finalScore: 55,
      ruleScore: 50,
      aiScore: 58,
      displayTone: 'hold',
      dataSources: { quote: null, rsi: 'Yahoo', news: 'RSS', x: null },
      weightPct: 90,
    },
  ],
  bestToday: [
    {
      rank: 1,
      symbol: '0883',
      displayLabelJa: '0883・香港（CNOOC Limited）',
      action: 'buy',
      confidence: 80,
      rsi14: 50,
      rsiSource: 'yahoo_finance',
      rationaleJa: '候補',
      finalScore: 65,
      ruleScore: 50,
      aiScore: 80,
      displayTone: 'buy',
      dataSources: { quote: null, rsi: 'Yahoo', news: 'RSS', x: null },
      weightPct: 10,
    },
  ],
  worstToday: [],
  riskWarnings: [],
};

const chinaMobile: PortfolioPosition = {
  id: 'pos-941',
  symbol: '0941',
  companyName: 'China Mobile Limited',
  market: 'hk',
  currency: 'HKD',
  shares: 1,
  averageBuyPrice: 68.5,
  currentPrice: 82.4,
  openedAt: '2024-01-01T00:00:00.000Z',
};

describe('buildAiDailyComment holding vs candidate mode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('with holdings: focuses on PnL and does not mention candidate bestToday symbol', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = buildAiDailyComment({
      bundle: null,
      portfolio: portfolioEval,
      holdings: [chinaMobile],
      dividends: [],
    });

    expect(result.todaySummaryJa).toContain('China Mobile');
    expect(result.todaySummaryJa).toContain('保有 1 銘柄');
    expect(result.todaySummaryJa).toMatch(/は現在[+-]\d/);
    expect(result.todaySummaryJa).toMatch(/利確目安/);
    expect(result.todaySummaryJa).toContain('保有評価');
    expect(result.todaySummaryJa).toContain('配当評価');
    expect(result.todaySummaryJa).toContain('リスク評価');
    expect(result.todaySummaryJa).not.toContain('本日の強い');
    expect(result.todaySummaryJa).not.toContain('0883');
  });

  it('without holdings: shows candidate ranking', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = buildAiDailyComment({
      bundle: null,
      portfolio: portfolioEval,
      holdings: [],
      dividends: [],
    });

    expect(result.todaySummaryJa).toContain('保有 0 銘柄');
    expect(result.todaySummaryJa).toContain('本日の強い候補');
    expect(result.todaySummaryJa).toContain('0883');
    expect(result.todaySummaryJa).not.toContain('利確目安');
  });
});
