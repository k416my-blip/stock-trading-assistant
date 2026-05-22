import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ALIGNMENT_INTEGRITY_UNCERTAIN_THRESHOLD,
  INTENT_HEALTH_DRIFTING_THRESHOLD,
  INTENT_HEALTH_FRAGMENTED_THRESHOLD,
  REINTERPRETATION_PRESSURE_THRESHOLD,
  UNSUPPORTED_INTENT_INFERENCE_THRESHOLD,
} from '../../src/constants/humanIntentContinuityAlignmentPreservation';
import {
  classifyIntentAlignmentState,
  computeIntentAlignmentMetrics,
} from '../../src/services/intentAlignmentEngine';
import { buildHumanIntentContinuityAlignmentPreservationBundle } from '../../src/services/humanIntentContinuityEngine';
import type { BuildHumanIntentContinuityInput } from '../../src/types/humanIntentContinuityAlignmentPreservation';
import type { HumanIntentContinuityPersisted } from '../../src/services/humanIntentContinuityStorage';

vi.mock('../../src/services/humanIntentContinuityStorage', () => ({
  loadHumanIntentContinuityState: vi.fn(async (): Promise<HumanIntentContinuityPersisted> => ({
    version: 1,
    lastAlignmentState: 'INTENT_ALIGNED',
    lastIntentHealthPct: 80,
    lastOrchestrationBudgetMax: 88,
    intentTimeline: [],
    refreshCount: 0,
  })),
  saveHumanIntentContinuityState: vi.fn(async () => {}),
  appendIntentSnapshot: vi.fn(async () => ({
    version: 1,
    lastAlignmentState: 'INTENT_ALIGNED',
    lastIntentHealthPct: 80,
    lastOrchestrationBudgetMax: 88,
    intentTimeline: [],
    refreshCount: 1,
  })),
}));

function baseInput(
  overrides: Partial<BuildHumanIntentContinuityInput> = {},
): BuildHumanIntentContinuityInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildHumanIntentContinuityInput['governance'],
    stability: null,
    systemic: null,
    consensus: null,
    epistemic: null,
    strategicMemoryGraph: null,
    cognitiveResourceEconomy: null,
    unifiedCognitiveState: null,
    orchestration: null,
    strategy: null,
    refreshCount: 3,
    ...overrides,
  };
}

describe('humanIntentContinuityEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('INTENT_DRIFTING when health below 70', async () => {
    const bundle = await buildHumanIntentContinuityAlignmentPreservationBundle(
      baseInput({ mockIntentHealthPct: 65 }),
    );
    expect(bundle.alignmentState).toBe('INTENT_DRIFTING');
    expect(bundle.instructionReinforcementActive).toBe(true);
  });

  it('INTENT_FRAGMENTED with context rebuild', async () => {
    const bundle = await buildHumanIntentContinuityAlignmentPreservationBundle(
      baseInput({ mockIntentHealthPct: 50 }),
    );
    expect(bundle.alignmentState).toBe('INTENT_FRAGMENTED');
    expect(bundle.contextRebuildActive).toBe(true);
    expect(bundle.semanticFreezeActive).toBe(true);
  });

  it('INTENT_REINTERPRETING on reinterpretation pressure', async () => {
    const bundle = await buildHumanIntentContinuityAlignmentPreservationBundle(
      baseInput({ mockReinterpretationPressureBoost: 65 }),
    );
    expect(bundle.alignmentState).toBe('INTENT_REINTERPRETING');
    expect(bundle.reinterpretationSuppressionActive).toBe(true);
    expect(bundle.semanticFreezeActive).toBe(true);
  });

  it('INTENT_UNCERTAIN on low alignment integrity', async () => {
    const bundle = await buildHumanIntentContinuityAlignmentPreservationBundle(
      baseInput({ mockAlignmentIntegrityPct: 42 }),
    );
    expect(bundle.alignmentState).toBe('INTENT_UNCERTAIN');
    expect(bundle.clarificationDowngradeActive).toBe(true);
  });

  it('INTENT_UNSUPPORTED on unsupported inference', async () => {
    const bundle = await buildHumanIntentContinuityAlignmentPreservationBundle(
      baseInput({ mockUnsupportedIntentInferenceBoost: 75 }),
    );
    expect(bundle.alignmentState).toBe('INTENT_UNSUPPORTED');
    expect(bundle.explanationOnlyMode).toBe(true);
    expect(bundle.unsupportedInferenceRiskPct).toBeGreaterThan(
      UNSUPPORTED_INTENT_INFERENCE_THRESHOLD,
    );
  });

  it('safe alignment drops under drift', async () => {
    const bundle = await buildHumanIntentContinuityAlignmentPreservationBundle(
      baseInput({
        mockIntentHealthPct: 60,
        mockSemanticDriftBoost: 30,
      }),
    );
    expect(bundle.safeAlignmentPct).toBeLessThan(bundle.intentHealthPct);
    expect(bundle.intentDriftPct).toBeGreaterThan(0);
  });

  it('paper trading and strategy change forbidden', async () => {
    const bundle = await buildHumanIntentContinuityAlignmentPreservationBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.strategyActionChangeForbidden).toBe(true);
    expect(bundle.autonomousGoalCreationForbidden).toBe(true);
    expect(bundle.hiddenIntentionForbidden).toBe(true);
  });

  it('state thresholds via classifyIntentAlignmentState', () => {
    const metrics = computeIntentAlignmentMetrics(
      baseInput({ mockIntentHealthPct: INTENT_HEALTH_DRIFTING_THRESHOLD - 5 }),
    );
    expect(metrics.intentHealthPct).toBeLessThan(INTENT_HEALTH_DRIFTING_THRESHOLD);
    expect(classifyIntentAlignmentState(metrics)).toBe('INTENT_DRIFTING');
  });

  it('fragmented threshold', () => {
    const metrics = computeIntentAlignmentMetrics(
      baseInput({ mockIntentHealthPct: INTENT_HEALTH_FRAGMENTED_THRESHOLD - 5 }),
    );
    expect(classifyIntentAlignmentState(metrics)).toBe('INTENT_FRAGMENTED');
  });

  it('reinterpretation pressure threshold', () => {
    const metrics = computeIntentAlignmentMetrics(
      baseInput({ mockReinterpretationPressureBoost: REINTERPRETATION_PRESSURE_THRESHOLD + 5 }),
    );
    expect(metrics.reinterpretationPressurePct).toBeGreaterThan(
      REINTERPRETATION_PRESSURE_THRESHOLD,
    );
    expect(classifyIntentAlignmentState(metrics)).toBe('INTENT_REINTERPRETING');
  });

  it('alignment integrity uncertain threshold', () => {
    const metrics = computeIntentAlignmentMetrics(
      baseInput({ mockAlignmentIntegrityPct: ALIGNMENT_INTEGRITY_UNCERTAIN_THRESHOLD - 5 }),
    );
    expect(classifyIntentAlignmentState(metrics)).toBe('INTENT_UNCERTAIN');
  });
});
