import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/capitalAllocationStorage', () => ({
  defaultCapitalAllocationState: () => ({
    version: 1,
    portfolioMode: 'balanced',
    beginnerMode: false,
    preferredSizingTier: 'standard',
  }),
  loadCapitalAllocationState: vi.fn(async () => ({
    version: 1,
    portfolioMode: 'balanced',
    beginnerMode: false,
    preferredSizingTier: 'standard',
  })),
  saveCapitalAllocationState: vi.fn(async () => undefined),
}));

vi.mock('../../src/services/fx', () => ({
  toMYR: (amount: number) => amount * 4.5,
}));

import { buildCapitalAllocationBundle } from '../../src/services/capitalAllocationEngine';
import { defaultCapitalAllocationState } from '../../src/services/capitalAllocationStorage';
import type { StrategyExecutionBundle } from '../../src/types/strategyExecution';

function mockStrategy(): StrategyExecutionBundle {
  return {
    generatedAt: new Date().toISOString(),
    tacticalMode: 'balanced',
    regimeId: 'bullish',
    regimeStrategyJa: 'test',
    todayRecommendations: [
      {
        symbol: 'AAPL',
        market: 'us',
        displayLabelJa: 'AAPL',
        action: 'buy',
        intent: 'action',
        confidencePct: 78,
        entryTiming: 'pullback',
        exitTiming: 'none',
        riskReward: {
          expectedUpsidePct: 10,
          downsideRiskPct: 8,
          rewardRiskRatio: 1.2,
          summaryJa: 'rr',
        },
        analystExplanationJa: 'test',
        whyProposedJa: 'test',
        positionSizePct: { conservative: 3, standard: 6, aggressive: 10 },
        opportunityScore: 70,
        threatScore: 20,
      },
    ],
    dangerAvoid: [],
    watchList: [],
    highExpectancy: [],
    opportunities: [],
    threats: [],
    allocation: {
      sectorBalanceJa: 'ok',
      concentrationJa: 'ok',
      recommendedCashRatioPct: 15,
      cashRatioRationaleJa: 'test',
    },
    overallConfidencePct: 65,
    macroNotes: [],
    learningFeedbackJa: [],
    predictionAccuracyJa: null,
    backtest: null,
    journalRecent: [],
    cooldownActive: false,
    cooldownNoteJa: null,
  };
}

describe('capitalAllocationEngine', () => {
  it('builds ai recommendation line with shares', () => {
    const bundle = buildCapitalAllocationBundle(defaultCapitalAllocationState(), {
      regimeId: 'bullish',
      tacticalMode: 'balanced',
      availableCashMYR: 50_000,
      totalEquityMYR: 120_000,
      priceBySymbol: { AAPL: 180 },
      strategyBundle: mockStrategy(),
      executionBundle: null,
      portfolioRiskBundle: null,
      macroBundle: null,
    });
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.aiRecommendationLineJa).toContain('あなたなら');
    expect(bundle.suggestedOrders.length).toBeGreaterThan(0);
    expect(bundle.suggestedOrders[0].recommendedShares).toBeGreaterThan(0);
    expect(bundle.overAllocationBlocked).toBe(false);
  });

  it('blocks over-allocation when budget exhausted', () => {
    const bundle = buildCapitalAllocationBundle(defaultCapitalAllocationState(), {
      regimeId: 'bullish',
      tacticalMode: 'aggressive',
      availableCashMYR: 50,
      totalEquityMYR: 100,
      priceBySymbol: { AAPL: 200 },
      strategyBundle: mockStrategy(),
      executionBundle: null,
      portfolioRiskBundle: null,
      macroBundle: null,
    });
    expect(bundle.suggestedOrders.length).toBe(0);
  });
});
