import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ARCH_HEALTH_REDUNDANT_THRESHOLD,
  MOBILE_PRESSURE_THRESHOLD,
  RECURSIVE_INFLATION_RISK_THRESHOLD,
} from '../../src/constants/selfEvolvingArchitectureReflectiveRefactor';
import {
  classifyArchitectureState,
  computeArchitectureMetrics,
  generateOptimizationProposals,
} from '../../src/services/reflectiveRefactorEngine';
import { buildSelfEvolvingArchitectureReflectiveRefactorBundle } from '../../src/services/selfEvolvingArchitectureEngine';
import type { BuildSelfEvolvingArchitectureInput } from '../../src/types/selfEvolvingArchitectureReflectiveRefactor';
import type { SelfArchitecturePersisted } from '../../src/services/selfArchitectureAuditStorage';

vi.mock('../../src/services/selfArchitectureAuditStorage', () => ({
  loadSelfArchitectureState: vi.fn(async (): Promise<SelfArchitecturePersisted> => ({
    version: 1,
    lastStructureState: 'ARCH_STABLE',
    lastArchitectureHealthPct: 75,
    lastOrchestrationBudgetMax: 88,
    architectureTimeline: [],
    pendingProposalCount: 0,
    refreshCount: 0,
  })),
  saveSelfArchitectureState: vi.fn(async () => {}),
  appendArchitectureSnapshot: vi.fn(async () => ({
    version: 1,
    lastStructureState: 'ARCH_STABLE',
    lastArchitectureHealthPct: 75,
    lastOrchestrationBudgetMax: 88,
    architectureTimeline: [],
    pendingProposalCount: 0,
    refreshCount: 1,
  })),
}));

function baseInput(
  overrides: Partial<BuildSelfEvolvingArchitectureInput> = {},
): BuildSelfEvolvingArchitectureInput {
  return {
    governance: {
      generatedAt: new Date().toISOString(),
      finalDecision: 'hold',
      finalDecisionLabelJa: '保有',
      consensusScore: 60,
      unifiedAiSummaryJa: 'gov',
      vetoLayer: null,
    } as unknown as BuildSelfEvolvingArchitectureInput['governance'],
    stability: null,
    systemic: null,
    recovery: null,
    regime: null,
    consensus: null,
    metaReliability: null,
    reflection: null,
    semantic: null,
    memory: null,
    orchestration: null,
    strategy: null,
    memoryPressure: false,
    batterySaver: false,
    ...overrides,
  };
}

describe('selfEvolvingArchitectureEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ARCH_REDUNDANT when health below 65', async () => {
    const bundle = await buildSelfEvolvingArchitectureReflectiveRefactorBundle(
      baseInput({ mockArchitectureHealthPct: 60 }),
    );
    expect(bundle.structureState).toBe('ARCH_REDUNDANT');
    expect(bundle.optimizationProposals.length).toBeGreaterThan(0);
    expect(bundle.governanceApprovalPending).toBe(true);
  });

  it('ARCH_RECURSIVE_RISK detects recursive inflation', () => {
    const metrics = computeArchitectureMetrics(
      baseInput({ mockRecursiveInflationBoost: 85 }),
    );
    expect(metrics.recursiveInflationPct).toBeGreaterThan(RECURSIVE_INFLATION_RISK_THRESHOLD);
    expect(classifyArchitectureState(metrics, false)).toBe('ARCH_RECURSIVE_RISK');
    const proposals = generateOptimizationProposals('ARCH_RECURSIVE_RISK', metrics);
    expect(proposals.some((p) => p.kind === 'reflection_throttle')).toBe(true);
  });

  it('ARCH_MOBILE_PRESSURE on mobile pressure', () => {
    const metrics = computeArchitectureMetrics(
      baseInput({ mockMobilePressureBoost: 50, memoryPressure: true, batterySaver: true }),
    );
    expect(metrics.mobilePressurePct).toBeGreaterThan(MOBILE_PRESSURE_THRESHOLD);
    expect(classifyArchitectureState(metrics, false)).toBe('ARCH_MOBILE_PRESSURE');
  });

  it('redundancy increases with mock layer boost', () => {
    const low = computeArchitectureMetrics(baseInput());
    const high = computeArchitectureMetrics(baseInput({ mockLayerRedundancyBoost: 60 }));
    expect(high.redundancyPct).toBeGreaterThan(low.redundancyPct);
    expect(high.architectureHealthPct).toBeLessThan(low.architectureHealthPct);
  });

  it('never enables automatic refactor', async () => {
    const bundle = await buildSelfEvolvingArchitectureReflectiveRefactorBundle(
      baseInput({ mockArchitectureHealthPct: 30, mockRecursiveInflationBoost: 90 }),
    );
    expect(bundle.automaticRefactorForbidden).toBe(true);
    expect(bundle.runtimeMutationForbidden).toBe(true);
    expect(bundle.proposalOnlyMode).toBe(true);
    for (const p of bundle.optimizationProposals) {
      expect(p.automaticApplyForbidden).toBe(true);
      expect(p.requiresGovernanceApproval).toBe(true);
    }
  });

  it('realTradingEnabled stays false', async () => {
    const bundle = await buildSelfEvolvingArchitectureReflectiveRefactorBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.architectureHealthPct).toBeGreaterThan(ARCH_HEALTH_REDUNDANT_THRESHOLD - 20);
  });
});
