import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CONFLICT_PRESSURE_COLLISION_THRESHOLD,
  CONFLICT_PRESSURE_CONFLICT_THRESHOLD,
  CONSTITUTIONAL_HEALTH_FRAGMENTED_THRESHOLD,
  EMERGENCY_PRECEDENCE_EMERGENCY_THRESHOLD,
  UNSUPPORTED_GOVERNANCE_RISK_THRESHOLD,
} from '../../src/constants/constitutionalGovernanceSystemCoherence';
import {
  classifyConstitutionalState,
  computeSystemCoherenceMetrics,
} from '../../src/services/systemCoherenceEngine';
import { buildConstitutionalGovernanceSystemCoherenceBundle } from '../../src/services/constitutionalGovernanceEngine';
import type { BuildConstitutionalGovernanceInput } from '../../src/types/constitutionalGovernanceSystemCoherence';
import type { ConstitutionalGovernancePersisted } from '../../src/services/constitutionalGovernanceStorage';

vi.mock('../../src/services/constitutionalGovernanceStorage', () => ({
  loadConstitutionalGovernanceState: vi.fn(async (): Promise<ConstitutionalGovernancePersisted> => ({
    version: 1,
    lastConstitutionalState: 'CONSTITUTIONAL_STABLE',
    lastConstitutionalHealthPct: 78,
    lastOrchestrationBudgetMax: 88,
    constitutionalTimeline: [],
    lastConflictPressurePct: 28,
    refreshCount: 0,
  })),
  saveConstitutionalGovernanceState: vi.fn(async () => {}),
  appendConstitutionalSnapshot: vi.fn(async () => ({
    version: 1,
    lastConstitutionalState: 'CONSTITUTIONAL_STABLE',
    lastConstitutionalHealthPct: 78,
    lastOrchestrationBudgetMax: 88,
    constitutionalTimeline: [],
    lastConflictPressurePct: 28,
    refreshCount: 1,
  })),
}));

const persisted: ConstitutionalGovernancePersisted = {
  version: 1,
  lastConstitutionalState: 'CONSTITUTIONAL_STABLE',
  lastConstitutionalHealthPct: 78,
  lastOrchestrationBudgetMax: 88,
  constitutionalTimeline: [],
  lastConflictPressurePct: 28,
  refreshCount: 0,
};

function baseInput(
  overrides: Partial<BuildConstitutionalGovernanceInput> = {},
): BuildConstitutionalGovernanceInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildConstitutionalGovernanceInput['governance'],
    stability: null,
    systemic: null,
    consensus: null,
    epistemic: null,
    strategicMemoryGraph: null,
    cognitiveResourceEconomy: null,
    unifiedCognitiveState: null,
    humanIntentContinuity: null,
    adaptiveExploration: null,
    orchestration: null,
    strategy: null,
    refreshCount: 3,
    ...overrides,
  };
}

describe('constitutionalGovernanceEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CONSTITUTIONAL_CONFLICT when conflict pressure above 60', async () => {
    const bundle = await buildConstitutionalGovernanceSystemCoherenceBundle(
      baseInput({ mockConflictPressurePct: 65 }),
    );
    expect(bundle.constitutionalState).toBe('CONSTITUTIONAL_CONFLICT');
    expect(bundle.precedenceArbitrationActive).toBe(true);
    expect(bundle.conflictPressurePct).toBeGreaterThan(CONFLICT_PRESSURE_CONFLICT_THRESHOLD);
  });

  it('CONSTITUTIONAL_COLLISION with override freeze', async () => {
    const bundle = await buildConstitutionalGovernanceSystemCoherenceBundle(
      baseInput({ mockConflictPressurePct: 80 }),
    );
    expect(bundle.constitutionalState).toBe('CONSTITUTIONAL_COLLISION');
    expect(bundle.overrideFreezeActive).toBe(true);
    expect(bundle.conflictPressurePct).toBeGreaterThan(CONFLICT_PRESSURE_COLLISION_THRESHOLD);
  });

  it('CONSTITUTIONAL_FRAGMENTED when health below 45', async () => {
    const bundle = await buildConstitutionalGovernanceSystemCoherenceBundle(
      baseInput({ mockConstitutionalHealthPct: 40, mockConflictPressurePct: 25 }),
    );
    expect(bundle.constitutionalState).toBe('CONSTITUTIONAL_FRAGMENTED');
    expect(bundle.hierarchyRebuildSuggestionActive).toBe(true);
  });

  it('CONSTITUTIONAL_EMERGENCY on low emergency precedence', async () => {
    const bundle = await buildConstitutionalGovernanceSystemCoherenceBundle(
      baseInput({
        mockEmergencyPrecedenceIntegrityPct: 35,
        mockConflictPressurePct: 25,
        mockConstitutionalHealthPct: 55,
      }),
    );
    expect(bundle.constitutionalState).toBe('CONSTITUTIONAL_EMERGENCY');
    expect(bundle.constitutionalEmergencyActive).toBe(true);
  });

  it('CONSTITUTIONAL_UNSUPPORTED on unsupported governance risk', async () => {
    const bundle = await buildConstitutionalGovernanceSystemCoherenceBundle(
      baseInput({ mockUnsupportedGovernanceBoost: 75 }),
    );
    expect(bundle.constitutionalState).toBe('CONSTITUTIONAL_UNSUPPORTED');
    expect(bundle.explanationOnlyMode).toBe(true);
    expect(bundle.fallbackFreezeActive).toBe(true);
    expect(bundle.unsupportedGovernanceRiskPct).toBeGreaterThan(
      UNSUPPORTED_GOVERNANCE_RISK_THRESHOLD,
    );
  });

  it('clamp collision detectable via layer flags', async () => {
    const bundle = await buildConstitutionalGovernanceSystemCoherenceBundle(
      baseInput({
        humanIntentContinuity: {
          semanticFreezeActive: true,
        } as BuildConstitutionalGovernanceInput['humanIntentContinuity'],
        adaptiveExploration: {
          perspectiveWideningActive: true,
        } as BuildConstitutionalGovernanceInput['adaptiveExploration'],
        mockConflictPressurePct: 25,
        mockConstitutionalHealthPct: 55,
      }),
    );
    expect(bundle.clampCollisionRiskPct).toBeGreaterThan(20);
  });

  it('system stability index drops under conflict', async () => {
    const bundle = await buildConstitutionalGovernanceSystemCoherenceBundle(
      baseInput({ mockConflictPressurePct: 50, mockConstitutionalHealthPct: 60 }),
    );
    expect(bundle.systemStabilityIndexPct).toBeLessThan(bundle.constitutionalHealthPct);
  });

  it('paper trading and strategy override forbidden', async () => {
    const bundle = await buildConstitutionalGovernanceSystemCoherenceBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.strategyActionChangeForbidden).toBe(true);
    expect(bundle.strategyOverrideForbidden).toBe(true);
    expect(bundle.layerBypassForbidden).toBe(true);
    expect(bundle.selfAmendmentForbidden).toBe(true);
  });

  it('conflict threshold via classifyConstitutionalState', () => {
    const metrics = computeSystemCoherenceMetrics(
      baseInput({ mockConflictPressurePct: CONFLICT_PRESSURE_CONFLICT_THRESHOLD + 3 }),
      persisted,
    );
    expect(classifyConstitutionalState(metrics)).toBe('CONSTITUTIONAL_CONFLICT');
  });

  it('fragmented threshold', () => {
    const metrics = computeSystemCoherenceMetrics(
      baseInput({
        mockConstitutionalHealthPct: CONSTITUTIONAL_HEALTH_FRAGMENTED_THRESHOLD - 5,
        mockConflictPressurePct: 20,
      }),
      persisted,
    );
    expect(classifyConstitutionalState(metrics)).toBe('CONSTITUTIONAL_FRAGMENTED');
  });

  it('emergency precedence threshold', () => {
    const metrics = computeSystemCoherenceMetrics(
      baseInput({
        mockEmergencyPrecedenceIntegrityPct: EMERGENCY_PRECEDENCE_EMERGENCY_THRESHOLD - 5,
        mockConflictPressurePct: 20,
        mockConstitutionalHealthPct: 55,
      }),
      persisted,
    );
    expect(classifyConstitutionalState(metrics)).toBe('CONSTITUTIONAL_EMERGENCY');
  });
});
