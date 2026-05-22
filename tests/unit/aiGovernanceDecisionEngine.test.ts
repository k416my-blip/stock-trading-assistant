import { describe, expect, it, vi } from 'vitest';
import type { BuildAiGovernanceDecisionInput } from '../../src/types/aiGovernanceDecision';
import type { DataReliabilityBundle } from '../../src/types/dataReliability';
import type { StrategyExecutionBundle } from '../../src/types/strategyExecution';

vi.mock('../../src/services/aiGovernanceDecisionStorage', () => ({
  loadAiGovernanceState: vi.fn(async () => ({
    version: 1,
    humanOverride: { preferHold: false, noteJa: null, setAt: null },
    auditTrail: [],
    lastFinalDecision: null,
    lastDecisionAt: null,
  })),
  appendGovernanceAuditEntry: vi.fn(async (entry: unknown) => ({
    version: 1,
    humanOverride: { preferHold: false, noteJa: null, setAt: null },
    auditTrail: [entry],
    lastFinalDecision: null,
    lastDecisionAt: null,
  })),
}));

import { buildAiGovernanceDecisionBundle } from '../../src/services/aiGovernanceDecisionEngine';

function mockData(gateOpen: boolean): DataReliabilityBundle {
  return {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: 'test',
    reliabilityTier: gateOpen ? 'high' : 'low',
    reliabilityBannerJa: 'test',
    globalDataQualityScore: gateOpen ? 80 : 30,
    aiInputGateOpen: gateOpen,
    aiGateNoteJa: gateOpen ? 'open' : 'closed',
    safeFallbackJa: null,
    symbols: [],
    apiHealth: [],
    storageIntegrityOk: true,
    storageCorruptionKeys: [],
    duplicateGuardNoteJa: null,
    timezoneNoteJa: 'JST',
    holidaySuppressionActive: false,
    corporateActionNoteJa: null,
    lineageSummaryJa: [],
  };
}

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

function baseInput(
  overrides: Partial<BuildAiGovernanceDecisionInput> = {},
): BuildAiGovernanceDecisionInput {
  return {
    systemStability: null,
    portfolioRisk: null,
    dataReliability: mockData(true),
    macro: null,
    execution: null,
    capitalAllocation: null,
    strategy: mockStrategy(),
    humanGovernanceOverride: { preferHold: false, noteJa: null, setAt: null },
    portfolioHumanRiskOverride: null,
    staleLayerIds: [],
    lastAudit: null,
    recentAuditFlipCount: 0,
    ...overrides,
  };
}

describe('buildAiGovernanceDecisionBundle', () => {
  it('downgrades buy when data gate is closed', async () => {
    const bundle = await buildAiGovernanceDecisionBundle(
      baseInput({ dataReliability: mockData(false) }),
    );
    expect(bundle.finalDecision).not.toBe('buy');
    expect(bundle.downgradedRecommendations.length).toBeGreaterThan(0);
    expect(bundle.blockedDecisions.length).toBeGreaterThan(0);
  });

  it('applies veto when stability blocks and strategy is bullish', async () => {
    const bundle = await buildAiGovernanceDecisionBundle(
      baseInput({
        systemStability: {
          generatedAt: new Date().toISOString(),
          safetyBannerJa: '',
          systemHealthScore: 35,
          healthLabelJa: '危険',
          emergencyReadOnlyActive: true,
          safeFallbackActive: true,
          freezePreventionJa: '',
          racePreventionJa: '',
          stateFlowJa: [],
          persistenceFlowJa: [],
          dependencyGraph: [],
          layerRows: [],
          featureStatuses: [],
          productionSnapshot: {} as never,
          integritySummaryJa: 'low',
          explainRuleBasisJa: '',
        },
      }),
    );
    expect(bundle.emergencyOverrideActive).toBe(true);
    expect(bundle.vetoes.length).toBeGreaterThan(0);
    expect(bundle.finalDecision).not.toBe('buy');
  });

  it('exposes 20 governance features', async () => {
    const bundle = await buildAiGovernanceDecisionBundle(baseInput());
    expect(bundle.featureStatuses).toHaveLength(20);
    expect(bundle.activeHierarchy).toHaveLength(7);
  });
});
