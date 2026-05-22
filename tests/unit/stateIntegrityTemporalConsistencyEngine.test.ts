import { describe, expect, it, vi } from 'vitest';
import type { BuildStateIntegrityTemporalInput } from '../../src/types/stateIntegrityTemporalConsistency';
import { REAL_TRADING_ENABLED } from '../../src/constants/stateIntegrityTemporalConsistency';

vi.mock('../../src/services/stateIntegrityTemporalConsistencyStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/stateIntegrityTemporalConsistencyStorage')
  >();
  return {
    ...actual,
    loadTemporalConsistencyState: vi.fn(async () => ({
      version: 1 as const,
      globalStateVersion: 2,
      snapshots: [],
      checkpoints: [],
      lastReplayIntegrityHash: null,
      lastGovernanceVersion: null,
      contradictionAuditCount: 0,
    })),
    saveTemporalConsistencyState: vi.fn(async () => {}),
    appendImmutableSnapshot: vi.fn(async (rec) => ({
      version: 1 as const,
      globalStateVersion: 3,
      snapshots: [rec],
      checkpoints: [],
      lastReplayIntegrityHash: null,
      lastGovernanceVersion: null,
      contradictionAuditCount: 0,
    })),
    appendReplayCheckpoint: vi.fn(async () => {}),
  };
});

import { buildStateIntegrityTemporalConsistencyBundle } from '../../src/services/stateIntegrityTemporalConsistencyEngine';
import {
  applyGovernanceFreshnessDowngrade,
  applyTemporalRollbackDowngrades,
} from '../../src/services/stateIntegrityTemporalConsistencyIntegration';

const staleGovernance = {
  generatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  safetyBannerJa: 'test',
  finalDecision: 'buy' as const,
  finalDecisionLabelJa: '買い',
  consensusScore: 70,
  contradictionDetected: false,
  contradictionDetailJa: null,
  vetoLayer: null,
  vetoLayerLabelJa: null,
  vetoReasonJa: null,
  unifiedAiSummaryJa: 'test',
  strategyConsistencyJa: 'ok',
  cooldownActive: false,
  cooldownNoteJa: null,
  humanOverrideActive: false,
  humanOverrideNoteJa: null,
  emergencyOverrideJa: null,
  downgradedRecommendations: [],
  blockedDecisions: [],
  activeHierarchy: [],
  explainTree: [],
  featureStatuses: [],
  explainRuleBasisJa: 'test',
} as unknown as import('../../src/types/aiGovernanceDecision').AiGovernanceDecisionBundle;

const baseInput: BuildStateIntegrityTemporalInput = {
  stateFingerprintJa: '{"holdings":2}',
  refreshGeneration: 1,
  refreshGenerationStale: false,
  governance: staleGovernance,
  reactive: null,
  resource: null,
  trace: null,
  stability: null,
  strategy: {
    generatedAt: new Date().toISOString(),
    tacticalMode: 'balanced',
    regimeId: 'bullish',
    regimeStrategyJa: 't',
    todayRecommendations: [
      {
        symbol: 'AAPL',
        market: 'us',
        displayLabelJa: 'AAPL',
        action: 'buy',
        intent: 'action',
        confidencePct: 80,
        entryTiming: 'pullback',
        exitTiming: 'none',
        riskReward: {
          expectedUpsidePct: 10,
          downsideRiskPct: 8,
          rewardRiskRatio: 1.2,
          summaryJa: 'rr',
        },
        analystExplanationJa: 't',
        whyProposedJa: 't',
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
  partialRecomputeActive: false,
  duplicateRefreshBlocked: false,
};

describe('stateIntegrityTemporalConsistencyEngine', () => {
  it('keeps realTradingEnabled false and bumps state version', async () => {
    const bundle = await buildStateIntegrityTemporalConsistencyBundle(baseInput);
    expect(bundle.realTradingEnabled).toBe(REAL_TRADING_ENABLED);
    expect(bundle.paperTradingOnly).toBe(true);
    expect(bundle.stateVersion).toBeGreaterThan(0);
    expect(bundle.governanceFresh).toBe(false);
  });

  it('blocks buy via governance freshness downgrade', () => {
    const integrity = {
      governanceFresh: false,
      replayIntegrityOk: true,
      emergencyStateFreeze: false,
    } as import('../../src/types/stateIntegrityTemporalConsistency').StateIntegrityTemporalConsistencyBundle;
    const out = applyGovernanceFreshnessDowngrade(staleGovernance, integrity);
    expect(out?.finalDecision).toBe('watch');
  });

  it('rollback downgrades buy to watch only', () => {
    const integrity = {
      rollbackApplied: true,
    } as import('../../src/types/stateIntegrityTemporalConsistency').StateIntegrityTemporalConsistencyBundle;
    const out = applyTemporalRollbackDowngrades(baseInput.strategy, integrity);
    expect(out?.todayRecommendations[0].action).toBe('watch');
  });

  it('flags stale refresh generation', async () => {
    const bundle = await buildStateIntegrityTemporalConsistencyBundle({
      ...baseInput,
      refreshGenerationStale: true,
    });
    expect(bundle.asyncConflictCount).toBeGreaterThan(0);
    expect(bundle.rollbackApplied || bundle.emergencyStateFreeze).toBe(true);
  });
});
