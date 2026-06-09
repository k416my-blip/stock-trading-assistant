import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildAiDailyComment } from '../../src/services/aiDailyCommentBuilder';
import type { PortfolioAiEvaluationBundle } from '../../src/types/portfolioAiEvaluation';

describe('buildAiDailyComment DAILY_COMMENT_TARGET log', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits [DAILY_COMMENT_TARGET] with bestToday[0]', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const portfolio: PortfolioAiEvaluationBundle = {
      generatedAt: new Date().toISOString(),
      evaluatedAtJa: 'test',
      portfolioScore: 55,
      holdingCount: 1,
      batchSource: 'openai',
      rankedHoldings: [
        {
          rank: 1,
          symbol: '0820EA',
          displayLabelJa: 'AHAM ETF',
          action: 'hold',
          confidence: 60,
          rsi14: 32,
          rsiSource: 'yahoo_finance',
          rationaleJa: 'test',
          finalScore: 51,
          ruleScore: 50,
          aiScore: 53,
          displayTone: 'hold',
          dataSources: { quote: null, rsi: 'Yahoo', news: 'RSS', x: null },
          weightPct: 100,
        },
      ],
      bestToday: [
        {
          rank: 1,
          symbol: '0820EA',
          displayLabelJa: 'AHAM ETF',
          action: 'hold',
          confidence: 60,
          rsi14: 32,
          rsiSource: 'yahoo_finance',
          rationaleJa: 'test',
          finalScore: 51,
          ruleScore: 50,
          aiScore: 53,
          displayTone: 'hold',
          dataSources: { quote: null, rsi: 'Yahoo', news: 'RSS', x: null },
          weightPct: 100,
        },
      ],
      worstToday: [],
      riskWarnings: [],
    };

    buildAiDailyComment({ bundle: null, portfolio, holdings: [] });

    const line = warn.mock.calls.find((c) => c[0] === '[DAILY_COMMENT_TARGET]');
    expect(line).toBeDefined();
    const payload = JSON.parse(String(line![1])) as { symbol: string; score: number; source: string };
    expect(payload).toEqual({
      symbol: '0820EA',
      score: 51,
      action: 'hold',
      conflict: false,
      source: 'openai',
    });
  });
});
