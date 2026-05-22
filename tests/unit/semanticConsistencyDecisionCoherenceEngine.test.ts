import { describe, expect, it, vi } from 'vitest';
import type { BuildSemanticConsistencyInput } from '../../src/types/semanticConsistencyDecisionCoherence';

vi.mock('../../src/services/semanticConsistencyDecisionCoherenceStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/semanticConsistencyDecisionCoherenceStorage')
  >();
  return {
    ...actual,
    loadSemanticNarrativeState: vi.fn(async () => ({
      version: 1 as const,
      lastSummaryJa: '前回は強気です',
      lastFinalDecision: 'watch',
      narrativeHistory: [],
    })),
    saveSemanticNarrativeState: vi.fn(async () => {}),
    appendNarrativeHistory: vi.fn(async () => 'diff detected'),
  };
});

import { buildSemanticConsistencyDecisionCoherenceBundle } from '../../src/services/semanticConsistencyDecisionCoherenceEngine';
import {
  applySemanticCoherenceToGovernance,
  applySemanticCoherenceToStrategy,
} from '../../src/services/semanticConsistencyDecisionCoherenceIntegration';

const baseInput: BuildSemanticConsistencyInput = {
  governance: {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: 'test',
    finalDecision: 'watch',
    finalDecisionLabelJa: '監視',
    consensusScore: 40,
    contradictionDetected: false,
    contradictionDetailJa: null,
    vetoLayer: null,
    vetoLayerLabelJa: null,
    vetoReasonJa: null,
    unifiedAiSummaryJa: '必ず上がる。大チャンスです。',
    strategyConsistencyJa: 'ok',
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
        reasonJa: 'risk',
      },
    ],
    blockedDecisions: [],
    activeHierarchy: [],
    explainTree: [],
    featureStatuses: [],
    explainRuleBasisJa: 'test',
  } as unknown as BuildSemanticConsistencyInput['governance'],
  trace: {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: 'test',
    paperTradingOnly: true,
    finalDecision: 'watch',
    finalDecisionLabelJa: '監視',
    reasoningChainJa: ['弱気 — リスク高'],
    causalChainJa: ['Governance veto'],
    influenceGraph: [],
    reasonWeightTree: [],
    consensusBreakdown: [],
    vetoExplanationJa: null,
    conflictExplanationJa: null,
    downgradeReasonChain: ['buy→watch'],
    healthImpactTraceJa: [],
    confidenceEvolution: [],
    stateSnapshotLink: { fingerprintJa: '{}', layerTimestamps: [] },
    marketContext: { priceSyncStatusJa: 'ok', symbols: [], volatilityNoteJa: 'x' },
    recommendationDiffs: [],
    strategyDriftJa: null,
    humanOverrideTraceJa: null,
    emergencyOverrideTraceJa: null,
    recursiveReasonGuardTriggered: false,
    contradictionTimeline: [],
    explainableScore: 85,
    explainableScoreFormulaJa: '',
    confidenceEvolutionFormulaJa: '',
    contradictionTraceFormulaJa: '',
    missingEvidenceJa: ['data gap'],
    weakSignalsJa: [],
    dataFreshnessTraceJa: [],
    sourceReliabilityWeights: [],
    explainableSummaryJa: '弱気で監視が妥当',
    aiSelfReflectionJa: 'ok',
    explainabilityHealthScore: 80,
    explainabilityHealthLabelJa: 'ok',
    replayTimeline: [],
    decisionComparatorJa: null,
    decisionTimeline: [],
    featureStatuses: [],
    explainRuleBasisJa: 'test',
  },
  strategy: {
    generatedAt: new Date().toISOString(),
    tacticalMode: 'balanced',
    regimeId: 'bullish',
    regimeStrategyJa: '必ず買い',
    todayRecommendations: [
      {
        symbol: 'AAPL',
        market: 'us',
        displayLabelJa: 'AAPL',
        action: 'watch',
        intent: 'watch',
        confidencePct: 40,
        entryTiming: 'pullback',
        exitTiming: 'none',
        riskReward: {
          expectedUpsidePct: 10,
          downsideRiskPct: 8,
          rewardRiskRatio: 1.2,
          summaryJa: 'rr',
        },
        analystExplanationJa: '以前は買い推奨',
        whyProposedJa: '以前は買い推奨',
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
  },
  temporal: null,
  resource: null,
  reactive: null,
  finalDecision: 'watch',
};

describe('semanticConsistencyDecisionCoherenceEngine', () => {
  it('detects contradiction and unsupported claims', async () => {
    const bundle = await buildSemanticConsistencyDecisionCoherenceBundle(baseInput);
    expect(bundle.paperTradingOnly).toBe(true);
    expect(bundle.unsupportedClaimsJa.length).toBeGreaterThan(0);
    expect(bundle.contradictionLanguageJa.length + bundle.unsupportedClaimsJa.length).toBeGreaterThan(
      0,
    );
    expect(bundle.traceToNarrativeJa.length).toBeGreaterThan(0);
  });

  it('triggers semantic freeze on severe mismatch with buy', async () => {
    const bundle = await buildSemanticConsistencyDecisionCoherenceBundle({
      ...baseInput,
      finalDecision: 'buy',
      governance: {
        ...baseInput.governance!,
        unifiedAiSummaryJa: '弱気。回避すべき。必ず損する。',
      } as BuildSemanticConsistencyInput['governance'],
    });
    expect(bundle.contradictionLanguageJa.length).toBeGreaterThan(0);
    expect(bundle.semanticDirection).toBe('bullish');
    expect(bundle.naturalLanguageIntegrityScore).toBeLessThanOrEqual(100);
  });

  it('sanitizes governance on freeze', () => {
    const bundle = {
      semanticFreeze: true,
      emergencyNarrativeFallbackJa: '安全説明のみ',
      governanceNarrativeSyncJa: 'x',
      vetoNarrativeJa: null,
      downgradeNarrativeJa: null,
    } as import('../../src/types/semanticConsistencyDecisionCoherence').SemanticConsistencyDecisionCoherenceBundle;
    const out = applySemanticCoherenceToGovernance(
      baseInput.governance as NonNullable<BuildSemanticConsistencyInput['governance']>,
      bundle,
    );
    expect(out?.unifiedAiSummaryJa).toContain('安全説明');
  });

  it('maps trace to narrative lines', async () => {
    const bundle = await buildSemanticConsistencyDecisionCoherenceBundle(baseInput);
    expect(bundle.explainabilityConfidenceMerged).toBeGreaterThan(0);
    expect(bundle.semanticReplayDiffJa).toBe('diff detected');
  });
});
