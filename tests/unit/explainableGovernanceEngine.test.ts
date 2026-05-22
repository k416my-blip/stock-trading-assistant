import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  EXPLANATION_CONSISTENCY_CONTRADICTED_THRESHOLD,
  EXPLANATION_RISK_THRESHOLD,
  TRANSPARENCY_OPAQUE_THRESHOLD,
  TRANSPARENCY_PARTIAL_THRESHOLD,
  UNSUPPORTED_EXPLANATION_RISK_THRESHOLD,
} from '../../src/constants/explainableGovernanceTransparentReasoning';
import {
  classifyExplainableState,
  computeTransparencyMetrics,
  buildSafeGovernanceRationales,
} from '../../src/services/reasoningTransparencyEngine';
import { buildExplainableGovernanceTransparentReasoningBundle } from '../../src/services/explainableGovernanceEngine';
import type { BuildExplainableGovernanceInput } from '../../src/types/explainableGovernanceTransparentReasoning';
import type { ExplainableGovernancePersisted } from '../../src/services/explainableGovernanceStorage';

vi.mock('../../src/services/explainableGovernanceStorage', () => ({
  loadExplainableGovernanceState: vi.fn(async (): Promise<ExplainableGovernancePersisted> => ({
    version: 1,
    lastExplainableState: 'EXPLAINABLE_OK',
    lastExplainabilityHealthPct: 80,
    lastOrchestrationBudgetMax: 90,
    explainableTimeline: [],
    lastTransparencyScorePct: 75,
    refreshCount: 0,
  })),
  saveExplainableGovernanceState: vi.fn(async () => {}),
  appendExplainableSnapshot: vi.fn(async () => ({
    version: 1,
    lastExplainableState: 'EXPLAINABLE_OK',
    lastExplainabilityHealthPct: 80,
    lastOrchestrationBudgetMax: 90,
    explainableTimeline: [],
    lastTransparencyScorePct: 75,
    refreshCount: 1,
  })),
}));

const persisted: ExplainableGovernancePersisted = {
  version: 1,
  lastExplainableState: 'EXPLAINABLE_OK',
  lastExplainabilityHealthPct: 80,
  lastOrchestrationBudgetMax: 90,
  explainableTimeline: [],
  lastTransparencyScorePct: 75,
  refreshCount: 0,
};

function baseInput(
  overrides: Partial<BuildExplainableGovernanceInput> = {},
): BuildExplainableGovernanceInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov summary',
      vetoLayer: null,
    } as unknown as BuildExplainableGovernanceInput['governance'],
    stability: null,
    systemic: null,
    consensus: null,
    metaReliability: null,
    epistemic: null,
    strategicMemoryGraph: null,
    cognitiveResourceEconomy: null,
    unifiedCognitiveState: null,
    humanIntentContinuity: null,
    adaptiveExploration: null,
    constitutionalGovernance: null,
    orchestration: null,
    strategy: null,
    refreshCount: 3,
    ...overrides,
  };
}

describe('explainableGovernanceEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXPLAINABLE_PARTIAL when transparency below 70', async () => {
    const bundle = await buildExplainableGovernanceTransparentReasoningBundle(
      baseInput({ mockTransparencyScorePct: 65 }),
    );
    expect(bundle.explainableState).toBe('EXPLAINABLE_PARTIAL');
    expect(bundle.safeSimplificationActive).toBe(true);
    expect(bundle.transparencyScorePct).toBeLessThan(TRANSPARENCY_PARTIAL_THRESHOLD);
  });

  it('EXPLAINABLE_OPAQUE when transparency below 55', async () => {
    const bundle = await buildExplainableGovernanceTransparentReasoningBundle(
      baseInput({ mockTransparencyScorePct: 50 }),
    );
    expect(bundle.explainableState).toBe('EXPLAINABLE_OPAQUE');
    expect(bundle.fallbackExplanationMode).toBe(true);
    expect(bundle.transparencyScorePct).toBeLessThan(TRANSPARENCY_OPAQUE_THRESHOLD);
  });

  it('EXPLAINABLE_RISK when explanation risk above 65', async () => {
    const bundle = await buildExplainableGovernanceTransparentReasoningBundle(
      baseInput({ mockExplanationRiskPct: 70, mockTransparencyScorePct: 80 }),
    );
    expect(bundle.explainableState).toBe('EXPLAINABLE_RISK');
    expect(bundle.explanationSuppressionActive).toBe(true);
    expect(bundle.explanationRiskPct).toBeGreaterThan(EXPLANATION_RISK_THRESHOLD);
  });

  it('EXPLAINABLE_UNSUPPORTED on unsupported explanation risk', async () => {
    const bundle = await buildExplainableGovernanceTransparentReasoningBundle(
      baseInput({ mockUnsupportedExplanationBoost: 80 }),
    );
    expect(bundle.explainableState).toBe('EXPLAINABLE_UNSUPPORTED');
    expect(bundle.explanationOnlyMode).toBe(true);
    expect(bundle.unsupportedExplanationRiskPct).toBeGreaterThan(
      UNSUPPORTED_EXPLANATION_RISK_THRESHOLD,
    );
  });

  it('EXPLAINABLE_CONTRADICTED on low explanation consistency', async () => {
    const bundle = await buildExplainableGovernanceTransparentReasoningBundle(
      baseInput({
        mockExplanationConsistencyPct: 40,
        mockTransparencyScorePct: 80,
        mockExplanationRiskPct: 20,
      }),
    );
    expect(bundle.explainableState).toBe('EXPLAINABLE_CONTRADICTED');
    expect(bundle.consistencyRebuildActive).toBe(true);
  });

  it('generates downgrade rationale from epistemic layer', async () => {
    const bundle = await buildExplainableGovernanceTransparentReasoningBundle(
      baseInput({
        epistemic: {
          epistemicHealthPct: 40,
          predictionThrottleActive: true,
          unsupportedClaimsPct: 20,
        } as BuildExplainableGovernanceInput['epistemic'],
      }),
    );
    expect(bundle.downgradeReasonsJa.length).toBeGreaterThan(0);
    expect(bundle.rawChainOfThoughtForbidden).toBe(true);
  });

  it('generates freeze rationale from resource economy', async () => {
    const rationales = buildSafeGovernanceRationales(
      baseInput({
        cognitiveResourceEconomy: {
          speculativeComputeClampActive: true,
        } as BuildExplainableGovernanceInput['cognitiveResourceEconomy'],
      }),
    );
    expect(rationales.some((r) => r.kind === 'freeze')).toBe(true);
  });

  it('constitutional override safe rationale', async () => {
    const bundle = await buildExplainableGovernanceTransparentReasoningBundle(
      baseInput({
        constitutionalGovernance: {
          overrideFreezeActive: true,
        } as BuildExplainableGovernanceInput['constitutionalGovernance'],
      }),
    );
    expect(bundle.overrideAccountabilityJa.length).toBeGreaterThan(0);
  });

  it('paper trading and no raw CoT', async () => {
    const bundle = await buildExplainableGovernanceTransparentReasoningBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.rawChainOfThoughtForbidden).toBe(true);
    expect(bundle.internalHiddenReasoningForbidden).toBe(true);
    expect(bundle.strategyActionChangeForbidden).toBe(true);
  });

  it('partial threshold via classifyExplainableState', () => {
    const metrics = computeTransparencyMetrics(
      baseInput({ mockTransparencyScorePct: TRANSPARENCY_PARTIAL_THRESHOLD - 5 }),
      persisted,
      [],
    );
    expect(classifyExplainableState(metrics)).toBe('EXPLAINABLE_PARTIAL');
  });

  it('contradicted threshold', () => {
    const metrics = computeTransparencyMetrics(
      baseInput({
        mockExplanationConsistencyPct: EXPLANATION_CONSISTENCY_CONTRADICTED_THRESHOLD - 5,
        mockTransparencyScorePct: 80,
      }),
      persisted,
      [],
    );
    expect(classifyExplainableState(metrics)).toBe('EXPLAINABLE_CONTRADICTED');
  });
});
