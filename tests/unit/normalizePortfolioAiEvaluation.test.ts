import { describe, expect, it } from 'vitest';
import { normalizePortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationFromStrategyBundle';
import type { PortfolioAiEvaluationBundle } from '../../src/types/portfolioAiEvaluation';

describe('normalizePortfolioAiEvaluation', () => {
  it('holdingCount=0 でも rankedHoldings があれば件数とスコアを復元', () => {
    const raw: PortfolioAiEvaluationBundle = {
      generatedAt: '2026-05-30T00:00:00.000Z',
      evaluatedAtJa: '5/30 0:00',
      portfolioScore: 61,
      holdingCount: 0,
      batchSource: 'hybrid',
      rankedHoldings: [
        {
          rank: 1,
          symbol: '1155',
          displayLabelJa: 'Maybank',
          action: 'hold',
          confidence: 55,
          rsi14: 50,
          rsiSource: 'yahoo',
          rationaleJa: 'test',
          finalScore: 61,
          ruleScore: 55,
          aiScore: 55,
          displayTone: 'hold',
          dataSources: { quote: 'Yahoo', rsi: 'Yahoo', news: null, x: null },
          weightPct: 100,
        },
      ],
      bestToday: [],
      worstToday: [],
      riskWarnings: [],
    };
    const n = normalizePortfolioAiEvaluation(raw);
    expect(n.holdingCount).toBe(1);
    expect(n.portfolioScore).toBe(61);
  });
});
