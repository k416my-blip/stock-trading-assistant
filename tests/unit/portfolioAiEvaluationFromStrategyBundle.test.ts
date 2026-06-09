import { describe, expect, it } from 'vitest';
import { resolvePortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationFromStrategyBundle';
import type { StrategyExecutionBundle } from '../../src/types/strategyExecution';

function minimalBundle(
  overrides: Partial<StrategyExecutionBundle> = {},
): StrategyExecutionBundle {
  return {
    tacticalMode: 'balanced',
    regimeStrategyJa: 'テスト',
    cooldownActive: false,
    cooldownNoteJa: null,
    allocation: {
      recommendedCashRatioPct: 15,
      cashRatioRationaleJa: '—',
      sectorBalanceJa: '—',
      concentrationJa: '—',
    },
    todayRecommendations: [
      {
        symbol: '1155',
        displayLabelJa: 'Maybank',
        action: 'hold',
        intent: 'watch',
        confidencePct: 62,
        opportunityScore: 55,
        whyProposedJa: 'テスト根拠',
        hybrid: {
          aiAction: 'hold',
          aiConfidencePct: 62,
          finalScore: 58,
          ruleScore: 55,
          aiScore: 60,
          rsi14: 48.2,
          rsiSource: 'yahoo_finance',
          rationaleJa: 'AI根拠',
        },
      },
    ],
    dangerAvoid: [],
    watchList: [],
    highExpectancy: [],
    hybridSecondEvaluator: { generatedAt: '2026-05-29T08:00:00.000Z', source: 'hybrid' },
    ...overrides,
  } as StrategyExecutionBundle;
}

describe('resolvePortfolioAiEvaluation', () => {
  it('uses portfolioAiEvaluation when present on bundle', () => {
    const built = resolvePortfolioAiEvaluation(minimalBundle());
    const bundle = minimalBundle({
      portfolioAiEvaluation: {
        ...built,
        portfolioScore: 77,
      },
    });
    expect(resolvePortfolioAiEvaluation(bundle).portfolioScore).toBe(77);
  });

  it('falls back to recommendations when portfolioAiEvaluation missing', () => {
    const eval_ = resolvePortfolioAiEvaluation(minimalBundle());
    expect(eval_.rankedHoldings).toHaveLength(1);
    expect(eval_.rankedHoldings[0].symbol).toBe('1155');
    expect(eval_.rankedHoldings[0].action).toBe('hold');
    expect(eval_.rankedHoldings[0].rationaleJa).toBe('AI根拠');
    expect(eval_.bestToday[0].symbol).toBe('1155');
  });

  it('shows empty sections as zero holdings without throwing', () => {
    const eval_ = resolvePortfolioAiEvaluation(
      minimalBundle({ todayRecommendations: [], hybridSecondEvaluator: null }),
    );
    expect(eval_.rankedHoldings).toHaveLength(0);
    expect(eval_.bestToday).toHaveLength(0);
    expect(eval_.portfolioScore).toBe(50);
  });
});
