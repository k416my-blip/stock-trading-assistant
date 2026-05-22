import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BUDGET_TRUST_CRITICAL,
  BUDGET_TRUST_DECAYING,
  CONFIDENCE_CLAMP_DECAYING,
  HALLUCINATION_UNSUPPORTED_THRESHOLD,
  SEMANTIC_DRIFT_DIVERGENCE_THRESHOLD,
} from '../../src/constants/metaReliabilityLongitudinalTrust';
import {
  classifyTrustState,
  computeLongitudinalMetrics,
  resolveTrustActions,
} from '../../src/services/longitudinalTrustAuditEngine';
import { buildMetaReliabilityLongitudinalTrustBundle } from '../../src/services/metaReliabilityEngine';
import type { BuildMetaReliabilityInput } from '../../src/types/metaReliabilityLongitudinalTrust';
import type { MetaReliabilityPersisted } from '../../src/services/metaReliabilityLongitudinalTrustStorage';

vi.mock('../../src/services/metaReliabilityLongitudinalTrustStorage', () => ({
  loadMetaReliabilityState: vi.fn(async (): Promise<MetaReliabilityPersisted> => ({
    version: 1,
    lastTrustState: 'TRUST_STABLE',
    lastMetaReliabilityPct: 72,
    lastOrchestrationBudgetMax: 85,
    longitudinalTimeline: [],
    lastFinalDecision: 'hold',
    lastRegimeId: 'neutral',
    refreshCount: 0,
  })),
  saveMetaReliabilityState: vi.fn(async () => {}),
  appendLongitudinalSnapshot: vi.fn(async () => ({
    version: 1,
    lastTrustState: 'TRUST_STABLE',
    lastMetaReliabilityPct: 72,
    lastOrchestrationBudgetMax: 85,
    longitudinalTimeline: [],
    lastFinalDecision: 'hold',
    lastRegimeId: 'neutral',
    refreshCount: 1,
  })),
}));

function baseInput(overrides: Partial<BuildMetaReliabilityInput> = {}): BuildMetaReliabilityInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 70,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildMetaReliabilityInput['governance'],
    stability: null,
    systemic: null,
    recovery: null,
    regime: null,
    consensus: null,
    reflection: null,
    semantic: null,
    orchestration: null,
    strategy: null,
    finalDecision: 'hold',
    ...overrides,
  };
}

const persistedStable: MetaReliabilityPersisted = {
  version: 1,
  lastTrustState: 'TRUST_STABLE',
  lastMetaReliabilityPct: 75,
  lastOrchestrationBudgetMax: 85,
  longitudinalTimeline: [],
  lastFinalDecision: 'hold',
  lastRegimeId: 'neutral',
  refreshCount: 0,
};

describe('metaReliabilityEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TRUST_DECAYING when meta reliability below 60', async () => {
    const bundle = await buildMetaReliabilityLongitudinalTrustBundle(
      baseInput({ mockMetaReliabilityPct: 55 }),
    );
    expect(bundle.trustState).toBe('TRUST_DECAYING');
    expect(bundle.confidenceClampPct).toBe(CONFIDENCE_CLAMP_DECAYING);
    expect(bundle.orchestrationBudgetMax).toBe(BUDGET_TRUST_DECAYING);
  });

  it('TRUST_CRITICAL watch/hold only', async () => {
    const bundle = await buildMetaReliabilityLongitudinalTrustBundle(
      baseInput({ mockMetaReliabilityPct: 25 }),
    );
    expect(bundle.trustState).toBe('TRUST_CRITICAL');
    expect(bundle.watchHoldOnly).toBe(true);
    expect(bundle.orchestrationBudgetMax).toBe(BUDGET_TRUST_CRITICAL);
  });

  it('EXPLANATION_DIVERGENCE on semantic drift', () => {
    const metrics = computeLongitudinalMetrics(
      baseInput({ mockSemanticDriftBoost: 80 }),
      persistedStable,
    );
    expect(metrics.semanticDriftPct).toBeGreaterThan(SEMANTIC_DRIFT_DIVERGENCE_THRESHOLD);
    expect(classifyTrustState(metrics, false)).toBe('EXPLANATION_DIVERGENCE');
    const r = resolveTrustActions('EXPLANATION_DIVERGENCE', metrics);
    expect(r.explanationOnlyMode).toBe(true);
  });

  it('LONGITUDINAL_UNSUPPORTED on hallucination risk', () => {
    const metrics = computeLongitudinalMetrics(
      baseInput({ mockHallucinationRisk: 90 }),
      persistedStable,
    );
    expect(metrics.hallucinationRiskPct).toBeGreaterThan(HALLUCINATION_UNSUPPORTED_THRESHOLD);
    expect(classifyTrustState(metrics, false)).toBe('LONGITUDINAL_UNSUPPORTED');
    const r = resolveTrustActions('LONGITUDINAL_UNSUPPORTED', metrics);
    expect(r.freezeAdaptiveLearning).toBe(true);
    expect(r.explanationOnlyMode).toBe(true);
  });

  it('confidence inflation detected via mock', () => {
    const metrics = computeLongitudinalMetrics(
      baseInput({ mockConfidenceInflation: 40 }),
      persistedStable,
    );
    expect(metrics.confidenceInflationPct).toBeGreaterThan(30);
  });

  it('realTradingEnabled stays false', async () => {
    const bundle = await buildMetaReliabilityLongitudinalTrustBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.paperTradingOnly).toBe(true);
  });
});
