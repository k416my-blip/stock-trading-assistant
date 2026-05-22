import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  DOGMA_PRESSURE_RIGID_THRESHOLD,
  DOGMA_PRESSURE_STAGNANT_THRESHOLD,
  EXPLORATION_HEALTH_OVERCLAMPED_THRESHOLD,
  UNCERTAINTY_ACCEPTANCE_UNCERTAIN_THRESHOLD,
  UNSUPPORTED_EXPLORATION_RISK_THRESHOLD,
} from '../../src/constants/adaptiveExplorationAntiDogma';
import {
  classifyExplorationState,
  computeAntiDogmaMetrics,
} from '../../src/services/antiDogmaEngine';
import { buildAdaptiveExplorationAntiDogmaBundle } from '../../src/services/adaptiveExplorationEngine';
import type { BuildAdaptiveExplorationInput } from '../../src/types/adaptiveExplorationAntiDogma';
import type { AdaptiveExplorationPersisted } from '../../src/services/adaptiveExplorationStorage';

vi.mock('../../src/services/adaptiveExplorationStorage', () => ({
  loadAdaptiveExplorationState: vi.fn(async (): Promise<AdaptiveExplorationPersisted> => ({
    version: 1,
    lastExplorationState: 'EXPLORATION_BALANCED',
    lastExplorationHealthPct: 72,
    lastOrchestrationBudgetMax: 86,
    explorationTimeline: [],
    repetitionScorePct: 20,
    refreshCount: 0,
  })),
  saveAdaptiveExplorationState: vi.fn(async () => {}),
  appendExplorationSnapshot: vi.fn(async () => ({
    version: 1,
    lastExplorationState: 'EXPLORATION_BALANCED',
    lastExplorationHealthPct: 72,
    lastOrchestrationBudgetMax: 86,
    explorationTimeline: [],
    repetitionScorePct: 22,
    refreshCount: 1,
  })),
}));

function baseInput(
  overrides: Partial<BuildAdaptiveExplorationInput> = {},
): BuildAdaptiveExplorationInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildAdaptiveExplorationInput['governance'],
    stability: null,
    systemic: null,
    consensus: null,
    epistemic: null,
    strategicMemoryGraph: null,
    cognitiveResourceEconomy: null,
    unifiedCognitiveState: null,
    humanIntentContinuity: null,
    orchestration: null,
    strategy: null,
    refreshCount: 3,
    ...overrides,
  };
}

describe('adaptiveExplorationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXPLORATION_RIGID when dogma pressure above 60', async () => {
    const bundle = await buildAdaptiveExplorationAntiDogmaBundle(
      baseInput({ mockDogmaPressurePct: 65, mockExplorationHealthPct: 55 }),
    );
    expect(bundle.explorationState).toBe('EXPLORATION_RIGID');
    expect(bundle.perspectiveWideningActive).toBe(true);
    expect(bundle.dogmaPressurePct).toBeGreaterThan(DOGMA_PRESSURE_RIGID_THRESHOLD);
  });

  it('EXPLORATION_STAGNANT when dogma pressure above 75', async () => {
    const bundle = await buildAdaptiveExplorationAntiDogmaBundle(
      baseInput({ mockDogmaPressurePct: 80 }),
    );
    expect(bundle.explorationState).toBe('EXPLORATION_STAGNANT');
    expect(bundle.safeAlternativeGenerationActive).toBe(true);
    expect(bundle.dogmaPressurePct).toBeGreaterThan(DOGMA_PRESSURE_STAGNANT_THRESHOLD);
  });

  it('EXPLORATION_OVERCLAMPED when health below 40', async () => {
    const bundle = await buildAdaptiveExplorationAntiDogmaBundle(
      baseInput({ mockExplorationHealthPct: 35, mockDogmaPressurePct: 25 }),
    );
    expect(bundle.explorationState).toBe('EXPLORATION_OVERCLAMPED');
    expect(bundle.clampRelaxationSuggestionActive).toBe(true);
  });

  it('EXPLORATION_UNCERTAIN on low uncertainty acceptance', async () => {
    const bundle = await buildAdaptiveExplorationAntiDogmaBundle(
      baseInput({
        mockUncertaintyAcceptancePct: 30,
        mockDogmaPressurePct: 25,
        mockExplorationHealthPct: 55,
      }),
    );
    expect(bundle.explorationState).toBe('EXPLORATION_UNCERTAIN');
    expect(bundle.uncertaintyAcknowledgmentActive).toBe(true);
  });

  it('EXPLORATION_UNSUPPORTED on unsupported exploration risk', async () => {
    const bundle = await buildAdaptiveExplorationAntiDogmaBundle(
      baseInput({ mockUnsupportedExplorationBoost: 75 }),
    );
    expect(bundle.explorationState).toBe('EXPLORATION_UNSUPPORTED');
    expect(bundle.explanationOnlyMode).toBe(true);
    expect(bundle.fallbackFreezeActive).toBe(true);
    expect(bundle.unsupportedExplorationRiskPct).toBeGreaterThan(
      UNSUPPORTED_EXPLORATION_RISK_THRESHOLD,
    );
  });

  it('safe exploration margin drops under dogma pressure', async () => {
    const bundle = await buildAdaptiveExplorationAntiDogmaBundle(
      baseInput({ mockDogmaPressureBoost: 40 }),
    );
    expect(bundle.safeExplorationMarginPct).toBeLessThan(bundle.explorationHealthPct);
  });

  it('consensus stagnation detectable via mock boost', async () => {
    const bundle = await buildAdaptiveExplorationAntiDogmaBundle(
      baseInput({ mockConsensusStagnationBoost: 45 }),
    );
    expect(bundle.consensusStagnationPct).toBeGreaterThan(30);
  });

  it('paper trading and strategy mutation forbidden', async () => {
    const bundle = await buildAdaptiveExplorationAntiDogmaBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.strategyActionChangeForbidden).toBe(true);
    expect(bundle.strategyMutationForbidden).toBe(true);
    expect(bundle.autonomousExperimentationForbidden).toBe(true);
    expect(bundle.humanIntentOverrideForbidden).toBe(true);
  });

  it('rigid threshold via classifyExplorationState', () => {
    const metrics = computeAntiDogmaMetrics(
      baseInput({ mockDogmaPressurePct: DOGMA_PRESSURE_RIGID_THRESHOLD + 5 }),
      {
        version: 1,
        lastExplorationState: 'EXPLORATION_BALANCED',
        lastExplorationHealthPct: 72,
        lastOrchestrationBudgetMax: 86,
        explorationTimeline: [],
        repetitionScorePct: 20,
        refreshCount: 0,
      },
    );
    expect(metrics.dogmaPressurePct).toBeGreaterThan(DOGMA_PRESSURE_RIGID_THRESHOLD);
    expect(classifyExplorationState(metrics)).toBe('EXPLORATION_RIGID');
  });

  it('overclamped threshold', () => {
    const metrics = computeAntiDogmaMetrics(
      baseInput({
        mockExplorationHealthPct: EXPLORATION_HEALTH_OVERCLAMPED_THRESHOLD - 5,
        mockDogmaPressurePct: 20,
      }),
      {
        version: 1,
        lastExplorationState: 'EXPLORATION_BALANCED',
        lastExplorationHealthPct: 72,
        lastOrchestrationBudgetMax: 86,
        explorationTimeline: [],
        repetitionScorePct: 20,
        refreshCount: 0,
      },
    );
    expect(classifyExplorationState(metrics)).toBe('EXPLORATION_OVERCLAMPED');
  });

  it('uncertainty acceptance threshold', () => {
    const metrics = computeAntiDogmaMetrics(
      baseInput({
        mockUncertaintyAcceptancePct: UNCERTAINTY_ACCEPTANCE_UNCERTAIN_THRESHOLD - 5,
        mockDogmaPressurePct: 20,
        mockExplorationHealthPct: 55,
      }),
      {
        version: 1,
        lastExplorationState: 'EXPLORATION_BALANCED',
        lastExplorationHealthPct: 72,
        lastOrchestrationBudgetMax: 86,
        explorationTimeline: [],
        repetitionScorePct: 20,
        refreshCount: 0,
      },
    );
    expect(classifyExplorationState(metrics)).toBe('EXPLORATION_UNCERTAIN');
  });
});
