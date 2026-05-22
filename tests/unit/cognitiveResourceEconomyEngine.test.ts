import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  COMPUTE_WASTE_THRESHOLD,
  RECURSIVE_PRESSURE_THRESHOLD,
  RESOURCE_HEALTH_FRAGMENTED_THRESHOLD,
  RESOURCE_HEALTH_STRESSED_THRESHOLD,
} from '../../src/constants/cognitiveResourceEconomyAttentionAllocation';
import {
  classifyResourceState,
  computeEconomyMetrics,
  collectComputeMetrics,
} from '../../src/services/attentionAllocationEngine';
import { buildCognitiveResourceEconomyAttentionAllocationBundle } from '../../src/services/cognitiveResourceEconomyEngine';
import type { BuildCognitiveResourceEconomyInput } from '../../src/types/cognitiveResourceEconomyAttentionAllocation';
import type { CognitiveResourceEconomyPersisted } from '../../src/services/cognitiveResourceEconomyStorage';

vi.mock('../../src/services/cognitiveResourceEconomyStorage', () => ({
  loadCognitiveResourceEconomyState: vi.fn(async (): Promise<CognitiveResourceEconomyPersisted> => ({
    version: 1,
    lastResourceState: 'RESOURCE_BALANCED',
    lastResourceHealthPct: 78,
    lastOrchestrationBudgetMax: 86,
    economyTimeline: [],
    refreshCount: 0,
  })),
  saveCognitiveResourceEconomyState: vi.fn(async () => {}),
  appendEconomySnapshot: vi.fn(async () => ({
    version: 1,
    lastResourceState: 'RESOURCE_BALANCED',
    lastResourceHealthPct: 78,
    lastOrchestrationBudgetMax: 86,
    economyTimeline: [],
    refreshCount: 1,
  })),
}));

function baseInput(
  overrides: Partial<BuildCognitiveResourceEconomyInput> = {},
): BuildCognitiveResourceEconomyInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildCognitiveResourceEconomyInput['governance'],
    stability: null,
    systemic: null,
    recovery: null,
    regime: null,
    consensus: null,
    metaReliability: null,
    epistemic: null,
    strategicMemoryGraph: null,
    reflection: null,
    resource: null,
    orchestration: null,
    strategy: null,
    batterySaver: false,
    memoryPressure: false,
    appForeground: true,
    refreshCount: 3,
    ...overrides,
  };
}

describe('cognitiveResourceEconomyEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RESOURCE_STRESSED when health below 70', async () => {
    const bundle = await buildCognitiveResourceEconomyAttentionAllocationBundle(
      baseInput({ mockResourceHealthPct: 65 }),
    );
    expect(bundle.resourceState).toBe('RESOURCE_STRESSED');
    expect(bundle.attentionNarrowingActive).toBe(true);
  });

  it('RESOURCE_RECURSIVE_PRESSURE on mock recursive load', () => {
    const audits = collectComputeMetrics(baseInput({ mockRecursiveLoadBoost: 75 }));
    const metrics = computeEconomyMetrics(baseInput({ mockRecursiveLoadBoost: 75 }), audits);
    expect(metrics.recursivePressurePct).toBeGreaterThan(RECURSIVE_PRESSURE_THRESHOLD);
    expect(classifyResourceState(metrics, false)).toBe('RESOURCE_RECURSIVE_PRESSURE');
  });

  it('RESOURCE_WASTEFUL on compute waste', async () => {
    const bundle = await buildCognitiveResourceEconomyAttentionAllocationBundle(
      baseInput({ mockComputeWasteBoost: 65 }),
    );
    expect(bundle.resourceState).toBe('RESOURCE_WASTEFUL');
    expect(bundle.speculativeComputeClampActive).toBe(true);
  });

  it('RESOURCE_FRAGMENTED when health below 55', async () => {
    const bundle = await buildCognitiveResourceEconomyAttentionAllocationBundle(
      baseInput({ mockResourceHealthPct: 50 }),
    );
    expect(bundle.resourceState).toBe('RESOURCE_FRAGMENTED');
    expect(bundle.priorityRebuildActive).toBe(true);
  });

  it('mobile pressure control with battery saver', async () => {
    const bundle = await buildCognitiveResourceEconomyAttentionAllocationBundle(
      baseInput({ batterySaver: true, mockMobilePressureBoost: 30 }),
    );
    expect(bundle.batteryPressurePct).toBeGreaterThan(50);
    expect(bundle.mobileHardClampActive).toBe(true);
  });

  it('realTradingEnabled false and no hidden compute', async () => {
    const bundle = await buildCognitiveResourceEconomyAttentionAllocationBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.hiddenComputeForbidden).toBe(true);
    expect(bundle.autonomousEscalationForbidden).toBe(true);
  });

  it('attention narrowing under stress threshold', () => {
    const audits = collectComputeMetrics(baseInput());
    const metrics = computeEconomyMetrics(
      baseInput({ mockResourceHealthPct: RESOURCE_HEALTH_STRESSED_THRESHOLD - 5 }),
      audits,
    );
    expect(metrics.resourceHealthPct).toBeLessThan(RESOURCE_HEALTH_STRESSED_THRESHOLD);
    expect(classifyResourceState(metrics, false)).toBe('RESOURCE_STRESSED');
  });

  it('RESOURCE_OVERLOADED deep reflection suppression', async () => {
    const bundle = await buildCognitiveResourceEconomyAttentionAllocationBundle(
      baseInput({ mockResourceHealthPct: 35 }),
    );
    expect(bundle.resourceState).toBe('RESOURCE_OVERLOADED');
    expect(bundle.deepReflectionSuppressed).toBe(true);
  });
});
