import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CONTRADICTION_CRITICAL_THRESHOLD,
  RECURSIVE_LOOPS_THRESHOLD,
  UNSUPPORTED_CAUSALITY_THRESHOLD,
} from '../../src/constants/strategicMemoryGraphTemporalCausality';
import {
  classifyGraphState,
  computeGraphMetrics,
  captureCausalNodes,
  estimateCausalEdges,
} from '../../src/services/temporalCausalityEngine';
import { buildStrategicMemoryGraphTemporalCausalityBundle } from '../../src/services/strategicMemoryGraphEngine';
import type { BuildStrategicMemoryGraphInput } from '../../src/types/strategicMemoryGraphTemporalCausality';
import type { StrategicMemoryGraphPersisted } from '../../src/services/strategicMemoryGraphStorage';

vi.mock('../../src/services/strategicMemoryGraphStorage', () => ({
  loadStrategicMemoryGraphState: vi.fn(async (): Promise<StrategicMemoryGraphPersisted> => ({
    version: 1,
    lastGraphState: 'GRAPH_STABLE',
    lastGraphHealthPct: 75,
    lastOrchestrationBudgetMax: 86,
    graphTimeline: [],
    lastEdgeCount: 0,
    refreshCount: 0,
    compressedEdges: [],
  })),
  saveStrategicMemoryGraphState: vi.fn(async () => {}),
  appendGraphSnapshot: vi.fn(async () => ({
    version: 1,
    lastGraphState: 'GRAPH_STABLE',
    lastGraphHealthPct: 75,
    lastOrchestrationBudgetMax: 86,
    graphTimeline: [],
    lastEdgeCount: 0,
    refreshCount: 1,
    compressedEdges: [],
  })),
}));

function baseInput(overrides: Partial<BuildStrategicMemoryGraphInput> = {}): BuildStrategicMemoryGraphInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildStrategicMemoryGraphInput['governance'],
    stability: null,
    systemic: null,
    recovery: null,
    regime: null,
    consensus: null,
    metaReliability: null,
    selfArchitecture: null,
    epistemic: null,
    reflection: null,
    orchestration: null,
    strategy: null,
    refreshCount: 3,
    ...overrides,
  };
}

describe('strategicMemoryGraphEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates causal edges from mock event chain', () => {
    const nodes = captureCausalNodes(baseInput());
    const edges = estimateCausalEdges(nodes, baseInput({ mockEventChainBoost: 40 }));
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.hypothesisOnly === true)).toBe(true);
  });

  it('GRAPH_FRAGMENTED when health below 70', async () => {
    const bundle = await buildStrategicMemoryGraphTemporalCausalityBundle(
      baseInput({ mockGraphHealthPct: 65 }),
    );
    expect(bundle.graphState).toBe('GRAPH_FRAGMENTED');
  });

  it('unsupported causality suppression', () => {
    const nodes = captureCausalNodes(baseInput());
    const edges = estimateCausalEdges(
      nodes,
      baseInput({ mockUnsupportedCausalityBoost: 70 }),
    );
    const metrics = computeGraphMetrics(
      baseInput({ mockUnsupportedCausalityBoost: 70 }),
      nodes,
      edges,
    );
    expect(metrics.unsupportedCausalityPct).toBeGreaterThan(UNSUPPORTED_CAUSALITY_THRESHOLD);
    expect(classifyGraphState(metrics, false)).toBe('GRAPH_CAUSALITY_UNCERTAIN');
  });

  it('GRAPH_OVERCONNECTED on recursive loops', () => {
    const nodes = captureCausalNodes(baseInput());
    const edges = estimateCausalEdges(nodes, baseInput({ mockRecursiveLoopsBoost: 80 }));
    const metrics = computeGraphMetrics(
      baseInput({ mockRecursiveLoopsBoost: 80 }),
      nodes,
      edges,
    );
    expect(metrics.recursiveLoopsPct).toBeGreaterThan(RECURSIVE_LOOPS_THRESHOLD);
    expect(classifyGraphState(metrics, false)).toBe('GRAPH_OVERCONNECTED');
  });

  it('contradiction triggers GRAPH_CONTRADICTED', () => {
    const nodes = captureCausalNodes(baseInput());
    const edges = estimateCausalEdges(nodes, baseInput({ mockContradictionBoost: 75 }));
    const metrics = computeGraphMetrics(
      baseInput({ mockContradictionBoost: 75 }),
      nodes,
      edges,
    );
    expect(metrics.contradictionPct).toBeGreaterThan(CONTRADICTION_CRITICAL_THRESHOLD);
    expect(classifyGraphState(metrics, false)).toBe('GRAPH_CONTRADICTED');
  });

  it('realTradingEnabled false and no self-modify', async () => {
    const bundle = await buildStrategicMemoryGraphTemporalCausalityBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.selfModifyingForbidden).toBe(true);
    expect(bundle.hiddenLearningForbidden).toBe(true);
    expect(bundle.causalHypothesisOnly).toBe(true);
  });
});
