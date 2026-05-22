import { describe, expect, it, vi } from 'vitest';
import type { BuildExplainableCognitiveTraceInput } from '../../src/types/explainableCognitiveTrace';
import type { AiGovernanceDecisionBundle } from '../../src/types/aiGovernanceDecision';
import type { StrategyExecutionBundle } from '../../src/types/strategyExecution';

vi.mock('../../src/services/explainableCognitiveTraceStorage', () => ({
  loadCognitiveTraceState: vi.fn(async () => ({
    version: 1,
    confidenceHistory: [],
    replayTimeline: [],
    lastRecommendations: [{ symbol: 'AAPL', action: 'watch' as const }],
    lastExplainableScore: 72,
    contradictionHistory: [],
    recentReasonHashes: [],
  })),
  saveCognitiveTraceState: vi.fn(async () => {}),
  appendCognitiveTraceReplay: vi.fn(async () => {}),
}));

import { buildExplainableCognitiveTraceBundle } from '../../src/services/explainableCognitiveTraceEngine';

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
        confidencePct: 85,
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
      sectorBalanceJa: '',
      concentrationJa: '',
      recommendedCashRatioPct: 20,
      cashRatioRationaleJa: '',
    },
    overallConfidencePct: 70,
    macroNotes: [],
    learningFeedbackJa: [],
    predictionAccuracyJa: null,
    backtest: null,
    journalRecent: [],
    cooldownActive: false,
    cooldownNoteJa: null,
  };
}

function mockGovernance(finalDecision: 'buy' | 'watch' = 'watch'): AiGovernanceDecisionBundle {
  return {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: 'paper only',
    finalDecision,
    finalDecisionLabelJa: finalDecision === 'buy' ? '買い' : '監視',
    consensusScore: 48,
    contradictionDetected: true,
    contradictionDetailJa: 'Macro bullish vs risk bearish',
    vetoLayer: 'portfolio_risk',
    vetoLayerLabelJa: 'Portfolio Risk',
    vetoReasonJa: '集中度高',
    unifiedAiSummaryJa: 'downgrade applied',
    strategyConsistencyJa: '一貫',
    cooldownActive: false,
    cooldownNoteJa: null,
    humanOverrideActive: false,
    humanOverrideNoteJa: null,
    emergencyOverrideJa: null,
    downgradedRecommendations: [
      {
        symbol: 'AAPL',
        fromAction: 'buy',
        toAction: 'watch',
        reasonJa: 'risk cap',
      },
    ],
    blockedDecisions: [],
    activeHierarchy: [
      {
        layerId: 'portfolio_risk',
        labelJa: 'Portfolio Risk',
        rank: 2,
        stance: 'bearish',
        healthWeight: 0.9,
        active: true,
        confidencePct: 55,
        stale: false,
        summaryJa: 'risk',
      },
      {
        layerId: 'ai_recommendation',
        labelJa: 'AI Recommendation',
        rank: 7,
        stance: 'bullish',
        healthWeight: 1,
        active: true,
        confidencePct: 80,
        stale: false,
        summaryJa: 'ai',
      },
    ],
    explainTree: [],
    featureStatuses: [],
    explainRuleBasisJa: 'hierarchy',
  } as unknown as AiGovernanceDecisionBundle;
}

const baseInput: BuildExplainableCognitiveTraceInput = {
  governance: mockGovernance('watch'),
  stability: null,
  reactive: null,
  dataReliability: null,
  macro: null,
  portfolioRisk: null,
  capital: null,
  execution: null,
  strategy: mockStrategy(),
  marketContext: {
    priceSyncStatusJa: '取得完了',
    symbols: [{ symbol: 'AAPL', intradayChangePct: 1.2, dataQualityScore: 80, stale: false }],
    volatilityNoteJa: 'bullish',
  },
  stateFingerprintJa: '{"holdings":1}',
  previousRecommendations: [{ symbol: 'AAPL', action: 'watch' }],
  previousExplainableScore: 72,
};

describe('explainableCognitiveTraceEngine', () => {
  it('builds trace with downgrade chain and explainable score', async () => {
    const bundle = await buildExplainableCognitiveTraceBundle(baseInput);
    expect(bundle.paperTradingOnly).toBe(true);
    expect(bundle.finalDecision).toBe('watch');
    expect(bundle.downgradeReasonChain.length).toBeGreaterThan(0);
    expect(bundle.reasoningChainJa.length).toBeGreaterThan(0);
    expect(bundle.causalChainJa.length).toBeGreaterThanOrEqual(3);
    expect(bundle.explainableScore).toBeGreaterThan(0);
    expect(bundle.recommendationDiffs.some((d) => d.symbol === 'AAPL')).toBe(true);
    expect(bundle.decisionComparatorJa).toContain('72');
  });

  it('records contradiction in timeline when governance detects conflict', async () => {
    const bundle = await buildExplainableCognitiveTraceBundle(baseInput);
    expect(bundle.conflictExplanationJa).toContain('Macro');
    expect(bundle.contradictionTimeline.some((c) => c.detailJa.includes('Macro'))).toBe(true);
  });
});
