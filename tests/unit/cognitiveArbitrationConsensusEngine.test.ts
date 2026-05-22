import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BUDGET_HARD_CONFLICT,
  BUDGET_PANIC_CONSENSUS,
} from '../../src/constants/cognitiveArbitrationConsensus';
import {
  classifyConsensusState,
  resolveConsensus,
} from '../../src/services/cognitiveConsensusResolutionEngine';
import { buildCognitiveArbitrationConsensusBundle } from '../../src/services/cognitiveArbitrationConsensusEngine';
import type { BuildCognitiveArbitrationInput } from '../../src/types/cognitiveArbitrationConsensus';
import type { ArbitrationMetrics } from '../../src/services/cognitiveConsensusResolutionEngine';

vi.mock('../../src/services/cognitiveArbitrationConsensusStorage', () => ({
  loadCognitiveArbitrationState: vi.fn(async () => ({
    version: 1 as const,
    lastConsensusState: 'CONSENSUS_OK' as const,
    lastOrchestrationBudgetMax: 85,
    lastContradictionRiskPct: 0,
    consensusTimeline: [],
    debounceUntil: null,
  })),
  saveCognitiveArbitrationState: vi.fn(async () => {}),
  appendConsensusTimelinePoint: vi.fn(async () => {}),
}));

function baseInput(overrides: Partial<BuildCognitiveArbitrationInput> = {}): BuildCognitiveArbitrationInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildCognitiveArbitrationInput['governance'],
    stability: null,
    systemic: null,
    recovery: null,
    regime: null,
    risk: null,
    macro: null,
    memory: null,
    reflection: null,
    semantic: null,
    orchestration: null,
    strategy: null,
    finalDecision: 'hold',
    ...overrides,
  };
}

function metrics(overrides: Partial<ArbitrationMetrics>): ArbitrationMetrics {
  return {
    contradictionRiskPct: 30,
    semanticAlignmentPct: 70,
    semanticConflictPct: 10,
    recommendationDivergencePct: 10,
    confidenceSpreadPct: 15,
    rollbackInstabilityPct: 5,
    governanceStressPct: 40,
    panicRiskPct: 20,
    stabilityHealthPct: 65,
    uncertaintyPct: 30,
    freezeSignalPct: 0,
    macroAgreementPct: 70,
    finalConsensusPct: 58,
    consensusHealthPct: 62,
    ...overrides,
  };
}

describe('cognitiveArbitrationConsensusEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SOFT then HARD conflict via mock disagreement', async () => {
    const soft = await buildCognitiveArbitrationConsensusBundle(
      baseInput({ mockLayerDisagreement: true, mockContradictionBoost: 20 }),
    );
    expect(['CONSENSUS_OK', 'SOFT_CONFLICT']).toContain(soft.consensusState);

    const hard = await buildCognitiveArbitrationConsensusBundle(
      baseInput({ mockLayerDisagreement: true, mockContradictionBoost: 80 }),
    );
    expect(hard.consensusState).toBe('HARD_CONFLICT');
    expect(hard.watchHoldOnly).toBe(true);
    expect(hard.orchestrationBudgetMax).toBe(BUDGET_HARD_CONFLICT);
  });

  it('GOVERNANCE_OVERRIDE when governance stress high', () => {
    const m = metrics({ governanceStressPct: 85 });
    expect(classifyConsensusState(m, false)).toBe('GOVERNANCE_OVERRIDE');
    const r = resolveConsensus('GOVERNANCE_OVERRIDE', m, false);
    expect(r.governanceOverrideActive).toBe(true);
  });

  it('PANIC_CONSENSUS when panic risk high', () => {
    const m = metrics({ panicRiskPct: 75 });
    expect(classifyConsensusState(m, false)).toBe('PANIC_CONSENSUS');
    const r = resolveConsensus('PANIC_CONSENSUS', m, true);
    expect(r.governancePriorityOnly).toBe(true);
    expect(r.orchestrationBudgetMax).toBe(BUDGET_PANIC_CONSENSUS);
  });

  it('UNSUPPORTED_STATE explanation-only', async () => {
    const bundle = await buildCognitiveArbitrationConsensusBundle(
      baseInput({
        mockUncertaintyPct: 80,
        regime: {
          generatedAt: new Date().toISOString(),
          safetyBannerJa: 'x',
          paperTradingOnly: true,
          realTradingEnabled: false,
          currentRegime: 'UNSUPPORTED_ENVIRONMENT',
          regimeLabelJa: '未対応',
          regimeConfidencePct: 30,
          uncertaintyPct: 80,
          panicRiskPct: 20,
          adaptationHealthPct: 40,
          adaptationMode: 'explanation_only',
          confidenceClampPct: 35,
          orchestrationBudgetMax: 85,
          governancePriorityMode: false,
          freezeAdaptiveLayers: true,
          explanationOnlyMode: true,
          volatilityRiskPct: 40,
          volatilityTrendPct: 0,
          macroShockPct: 0,
          liquidityRiskPct: 0,
          governanceStressPct: 0,
          confidenceDriftPct: 0,
          activeLayersSummaryJa: '—',
          suspendedLayersSummaryJa: '—',
          governanceOverrideJa: 'none',
          recoveryInteractionJa: 'none',
          mobileRuntimeStateJa: 'x',
          regimeSummaryJa: 'x',
          classificationDisclaimerJa: 'x',
          regimeConfidenceFormulaJa: 'x',
          uncertaintyFormulaJa: 'x',
          adaptationHealthFormulaJa: 'x',
          panicRiskFormulaJa: 'x',
          regimeFlowJa: [],
          adaptationFlowJa: [],
          orchestrationHandoffJa: [],
          regimeTimeline: [],
          explainRuleBasisJa: 'x',
          featureStatuses: [],
        },
      }),
    );
    expect(bundle.consensusState).toBe('UNSUPPORTED_STATE');
    expect(bundle.explanationOnlyMode).toBe(true);
    expect(bundle.realTradingEnabled).toBe(false);
  });

  it('weighted consensus uses participant priorities', async () => {
    const bundle = await buildCognitiveArbitrationConsensusBundle(baseInput());
    expect(bundle.finalConsensusPct).toBeGreaterThan(0);
    expect(bundle.participantSignals.filter((p) => p.active).length).toBeGreaterThanOrEqual(1);
  });

  it('bundle has >= 25 features', async () => {
    const bundle = await buildCognitiveArbitrationConsensusBundle(baseInput());
    expect(bundle.featureStatuses.length).toBeGreaterThanOrEqual(25);
    expect(bundle.realTradingEnabled).toBe(false);
  });
});
