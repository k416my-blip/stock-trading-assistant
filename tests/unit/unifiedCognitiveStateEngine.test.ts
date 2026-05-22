import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  EXECUTIVE_HEALTH_FRAGMENTED_THRESHOLD,
  EXECUTIVE_HEALTH_STRAINED_THRESHOLD,
  GLOBAL_COHERENCE_UNCERTAIN_THRESHOLD,
  HALLUCINATION_EMERGENCY_THRESHOLD,
  RECURSIVE_DANGER_THRESHOLD,
} from '../../src/constants/unifiedCognitiveStateExecutiveAwareness';
import {
  classifyExecutiveState,
  computeExecutiveMetrics,
  collectLayerStates,
} from '../../src/services/executiveAwarenessEngine';
import { buildUnifiedCognitiveStateExecutiveAwarenessBundle } from '../../src/services/unifiedCognitiveStateEngine';
import type { BuildUnifiedCognitiveStateInput } from '../../src/types/unifiedCognitiveStateExecutiveAwareness';
import type { UnifiedCognitiveStatePersisted } from '../../src/services/unifiedCognitiveStateStorage';

vi.mock('../../src/services/unifiedCognitiveStateStorage', () => ({
  loadUnifiedCognitiveState: vi.fn(async (): Promise<UnifiedCognitiveStatePersisted> => ({
    version: 1,
    lastExecutiveState: 'EXECUTIVE_STABLE',
    lastExecutiveHealthPct: 80,
    lastOrchestrationBudgetMax: 88,
    executiveTimeline: [],
    refreshCount: 0,
  })),
  saveUnifiedCognitiveState: vi.fn(async () => {}),
  appendExecutiveSnapshot: vi.fn(async () => ({
    version: 1,
    lastExecutiveState: 'EXECUTIVE_STABLE',
    lastExecutiveHealthPct: 80,
    lastOrchestrationBudgetMax: 88,
    executiveTimeline: [],
    refreshCount: 1,
  })),
}));

function baseInput(
  overrides: Partial<BuildUnifiedCognitiveStateInput> = {},
): BuildUnifiedCognitiveStateInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildUnifiedCognitiveStateInput['governance'],
    stability: null,
    systemic: null,
    recovery: null,
    regime: null,
    consensus: null,
    metaReliability: null,
    selfArchitecture: null,
    epistemic: null,
    strategicMemoryGraph: null,
    cognitiveResourceEconomy: null,
    orchestration: null,
    strategy: null,
    batterySaver: false,
    memoryPressure: false,
    appForeground: true,
    refreshCount: 3,
    ...overrides,
  };
}

describe('unifiedCognitiveStateEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXECUTIVE_STRAINED when health below 70', async () => {
    const bundle = await buildUnifiedCognitiveStateExecutiveAwarenessBundle(
      baseInput({ mockExecutiveHealthPct: 65 }),
    );
    expect(bundle.executiveState).toBe('EXECUTIVE_STRAINED');
    expect(bundle.reduceReasoningDepthActive).toBe(true);
  });

  it('EXECUTIVE_FRAGMENTED with coherence rebuild', async () => {
    const bundle = await buildUnifiedCognitiveStateExecutiveAwarenessBundle(
      baseInput({ mockExecutiveHealthPct: 50 }),
    );
    expect(bundle.executiveState).toBe('EXECUTIVE_FRAGMENTED');
    expect(bundle.priorityCoherenceRebuildActive).toBe(true);
    expect(bundle.deepReasoningFreezeActive).toBe(true);
  });

  it('EXECUTIVE_UNCERTAIN on low global coherence', async () => {
    const bundle = await buildUnifiedCognitiveStateExecutiveAwarenessBundle(
      baseInput({ mockGlobalCoherencePct: 42 }),
    );
    expect(bundle.executiveState).toBe('EXECUTIVE_UNCERTAIN');
    expect(bundle.predictionThrottleActive).toBe(true);
  });

  it('EXECUTIVE_RECURSIVE_RISK on recursive danger', () => {
    const layers = collectLayerStates(baseInput({ mockRecursiveDangerBoost: 75 }));
    const metrics = computeExecutiveMetrics(baseInput({ mockRecursiveDangerBoost: 75 }), layers);
    expect(metrics.recursiveDangerPct).toBeGreaterThan(RECURSIVE_DANGER_THRESHOLD);
    expect(classifyExecutiveState(metrics, false)).toBe('EXECUTIVE_RECURSIVE_RISK');
  });

  it('EXECUTIVE_EMERGENCY on hallucination fallback', async () => {
    const bundle = await buildUnifiedCognitiveStateExecutiveAwarenessBundle(
      baseInput({ mockHallucinationRiskBoost: 75 }),
    );
    expect(bundle.executiveState).toBe('EXECUTIVE_EMERGENCY');
    expect(bundle.explanationOnlyMode).toBe(true);
    expect(bundle.hallucinationRiskPct).toBeGreaterThan(HALLUCINATION_EMERGENCY_THRESHOLD);
  });

  it('safe reasoning depth drops under fragmentation', async () => {
    const bundle = await buildUnifiedCognitiveStateExecutiveAwarenessBundle(
      baseInput({
        mockExecutiveHealthPct: 55,
        mockContradictionPressureBoost: 40,
      }),
    );
    expect(bundle.safeReasoningDepthPct).toBeLessThan(bundle.executiveHealthPct);
    expect(bundle.fragmentationScorePct).toBeGreaterThan(0);
  });

  it('strategy action change forbidden', async () => {
    const bundle = await buildUnifiedCognitiveStateExecutiveAwarenessBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.strategyActionChangeForbidden).toBe(true);
    expect(bundle.hiddenCognitionForbidden).toBe(true);
    expect(bundle.autonomousSelfDirectionForbidden).toBe(true);
  });

  it('attention narrowing equivalent — strained threshold', () => {
    const layers = collectLayerStates(baseInput());
    const metrics = computeExecutiveMetrics(
      baseInput({ mockExecutiveHealthPct: EXECUTIVE_HEALTH_STRAINED_THRESHOLD - 5 }),
      layers,
    );
    expect(metrics.executiveHealthPct).toBeLessThan(EXECUTIVE_HEALTH_STRAINED_THRESHOLD);
    expect(classifyExecutiveState(metrics, false)).toBe('EXECUTIVE_STRAINED');
  });

  it('global coherence uncertain threshold', () => {
    const layers = collectLayerStates(baseInput());
    const metrics = computeExecutiveMetrics(
      baseInput({ mockGlobalCoherencePct: GLOBAL_COHERENCE_UNCERTAIN_THRESHOLD - 5 }),
      layers,
    );
    expect(metrics.globalCoherencePct).toBeLessThan(GLOBAL_COHERENCE_UNCERTAIN_THRESHOLD);
    expect(classifyExecutiveState(metrics, false)).toBe('EXECUTIVE_UNCERTAIN');
  });
});
