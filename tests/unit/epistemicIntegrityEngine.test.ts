import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CONFIDENCE_CLAMP_UNCERTAIN,
  HALLUCINATION_RISK_THRESHOLD,
  UNSUPPORTED_CLAIMS_THRESHOLD,
} from '../../src/constants/epistemicIntegrityTruthCalibration';
import {
  classifyEpistemicState,
  computeEpistemicMetrics,
} from '../../src/services/truthCalibrationEngine';
import { buildEpistemicIntegrityTruthCalibrationBundle } from '../../src/services/epistemicIntegrityEngine';
import type { BuildEpistemicIntegrityInput } from '../../src/types/epistemicIntegrityTruthCalibration';
import type { EpistemicIntegrityPersisted } from '../../src/services/epistemicIntegrityStorage';

vi.mock('../../src/services/epistemicIntegrityStorage', () => ({
  loadEpistemicIntegrityState: vi.fn(async (): Promise<EpistemicIntegrityPersisted> => ({
    version: 1,
    lastEpistemicState: 'EPISTEMIC_STABLE',
    lastEpistemicHealthPct: 75,
    lastOrchestrationBudgetMax: 86,
    epistemicTimeline: [],
    refreshCount: 0,
  })),
  saveEpistemicIntegrityState: vi.fn(async () => {}),
  appendEpistemicSnapshot: vi.fn(async () => ({
    version: 1,
    lastEpistemicState: 'EPISTEMIC_STABLE',
    lastEpistemicHealthPct: 75,
    lastOrchestrationBudgetMax: 86,
    epistemicTimeline: [],
    refreshCount: 1,
  })),
}));

function baseInput(overrides: Partial<BuildEpistemicIntegrityInput> = {}): BuildEpistemicIntegrityInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 72,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildEpistemicIntegrityInput['governance'],
    stability: null,
    systemic: null,
    recovery: null,
    regime: null,
    consensus: null,
    metaReliability: null,
    selfArchitecture: null,
    reflection: null,
    semantic: null,
    temporal: null,
    epistemicWeight: null,
    trace: null,
    memory: null,
    orchestration: null,
    strategy: null,
    ...overrides,
  };
}

describe('epistemicIntegrityEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EPISTEMIC_UNCERTAIN clamps confidence', async () => {
    const bundle = await buildEpistemicIntegrityTruthCalibrationBundle(
      baseInput({ mockEpistemicHealthPct: 65 }),
    );
    expect(bundle.epistemicState).toBe('EPISTEMIC_UNCERTAIN');
    expect(bundle.confidenceClampPct).toBe(CONFIDENCE_CLAMP_UNCERTAIN);
  });

  it('EPISTEMIC_UNSUPPORTED on mock unsupported claims', () => {
    const metrics = computeEpistemicMetrics(
      baseInput({ mockUnsupportedClaimsBoost: 80 }),
    );
    expect(metrics.unsupportedClaimsPct).toBeGreaterThan(UNSUPPORTED_CLAIMS_THRESHOLD);
    expect(classifyEpistemicState(metrics, false)).toBe('EPISTEMIC_UNSUPPORTED');
  });

  it('EPISTEMIC_HALLUCINATION_RISK triggers suppression', async () => {
    const metrics = computeEpistemicMetrics(
      baseInput({ mockHallucinationDensityBoost: 70, mockUnsupportedClaimsBoost: 50 }),
    );
    expect(metrics.hallucinationRiskPct).toBeGreaterThan(HALLUCINATION_RISK_THRESHOLD);
    const bundle = await buildEpistemicIntegrityTruthCalibrationBundle(
      baseInput({ mockHallucinationDensityBoost: 70, mockUnsupportedClaimsBoost: 50 }),
    );
    expect(bundle.epistemicState).toBe('EPISTEMIC_HALLUCINATION_RISK');
    expect(bundle.speculationSuppressed).toBe(true);
    expect(bundle.predictionThrottleActive).toBe(true);
  });

  it('contradiction detection via mock boost', () => {
    const metrics = computeEpistemicMetrics(baseInput({ mockContradictionBoost: 75 }));
    expect(classifyEpistemicState(metrics, false)).toBe('EPISTEMIC_CONTRADICTED');
  });

  it('unknown state ratio is allowed (non-zero when uncertain)', async () => {
    const bundle = await buildEpistemicIntegrityTruthCalibrationBundle(
      baseInput({ mockEpistemicHealthPct: 60 }),
    );
    expect(bundle.unknownStateRatioPct).toBeGreaterThan(0);
  });

  it('realTradingEnabled stays false', async () => {
    const bundle = await buildEpistemicIntegrityTruthCalibrationBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.paperTradingOnly).toBe(true);
  });
});
