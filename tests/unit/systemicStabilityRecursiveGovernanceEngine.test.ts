import { describe, expect, it, vi } from 'vitest';
import type { BuildSystemicStabilityInput } from '../../src/types/systemicStabilityRecursiveGovernance';
import {
  CASCADE_RISK_THRESHOLD,
  RECURSIVE_RISK_THRESHOLD,
} from '../../src/constants/systemicStabilityRecursiveGovernance';

vi.mock('../../src/services/systemicStabilityRecursiveGovernanceStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/systemicStabilityRecursiveGovernanceStorage')
  >();
  return {
    ...actual,
    loadSystemicStabilityState: vi.fn(async () => ({
      version: 1 as const,
      stabilityTimeline: [],
      metaStabilitySnapshots: [],
      lastStabilityHealth: null,
    })),
    saveSystemicStabilityState: vi.fn(async () => {}),
    appendStabilityTimelinePoint: vi.fn(async () => 5),
  };
});

import { buildSystemicStabilityRecursiveGovernanceBundle } from '../../src/services/systemicStabilityRecursiveGovernanceEngine';
import {
  applySystemicEmergencySafeModeToStrategy,
  applySystemicStabilityToGovernance,
} from '../../src/services/systemicStabilityRecursiveGovernanceIntegration';

const baseInput: BuildSystemicStabilityInput = {
  governance: {
    finalDecision: 'buy',
    unifiedAiSummaryJa: 'x'.repeat(400),
    consensusScore: 40,
    vetoLayer: true,
  } as unknown as BuildSystemicStabilityInput['governance'],
  temporal: { rollbackApplied: true, replayIntegrityOk: false, emergencyStateFreeze: true } as unknown as BuildSystemicStabilityInput['temporal'],
  semantic: { semanticFreeze: true, finalDecisionCoherenceScore: 30 } as unknown as BuildSystemicStabilityInput['semantic'],
  epistemic: { reliabilityFreeze: true, reliabilityHealthScore: 25, confidenceDriftPct: 40 } as unknown as BuildSystemicStabilityInput['epistemic'],
  arbitration: {
    deadlockDetected: true,
    arbitrationConflicts: [{}, {}, {}],
    priorityDriftPct: 50,
    downgradeReasonJa: 'drift',
    arbitrationHealthScore: 20,
  } as unknown as BuildSystemicStabilityInput['arbitration'],
  reflection: {
    reflectionFreeze: true,
    metaEmergencyShutdown: true,
    contradictionTrendPct: 35,
    fatigueScore: 80,
    confidenceVolatilityPct: 70,
    driftTimeline: [{}, {}, {}, {}, {}, {}],
    selfCritiqueScore: 20,
    reflectionConsensusPct: 30,
  } as unknown as BuildSystemicStabilityInput['reflection'],
  compression: {
    cognitiveStabilityFreeze: true,
    replayCorruptionDetected: true,
    emergencyContextCollapse: true,
    memorySaturationPct: 85,
    compressionRatioPct: 52,
    recursiveDepth: 8,
    abstractedNarrativeJa: 'snapshot narrative',
  } as unknown as BuildSystemicStabilityInput['compression'],
  resource: { aiLoadPct: 85 } as unknown as BuildSystemicStabilityInput['resource'],
  trace: null,
  strategy: {
    todayRecommendations: [
      {
        symbol: 'AAPL',
        action: 'buy',
        intent: 'buy',
        confidencePct: 90,
        whyProposedJa: 't',
        analystExplanationJa: 't',
      },
    ],
  } as unknown as BuildSystemicStabilityInput['strategy'],
  stability: null,
  reactive: null,
  finalDecision: 'buy',
};

describe('systemicStabilityRecursiveGovernanceEngine', () => {
  it('forces realTradingEnabled false and 30 features', async () => {
    const bundle = await buildSystemicStabilityRecursiveGovernanceBundle(baseInput);
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.paperTradingOnly).toBe(true);
    expect(bundle.featureStatuses).toHaveLength(30);
    expect(bundle.arbitrationHalted).toBe(true);
    expect(bundle.emergencyGovernanceHalt).toBe(true);
  });

  it('triggers safe mode and cascade isolation at thresholds', async () => {
    const bundle = await buildSystemicStabilityRecursiveGovernanceBundle(baseInput);
    if (bundle.recursiveRiskPct > RECURSIVE_RISK_THRESHOLD) {
      expect(bundle.recursiveFreezeActive).toBe(true);
    }
    if (bundle.cascadeRiskPct > CASCADE_RISK_THRESHOLD) {
      expect(bundle.cascadeIsolationActive).toBe(true);
    }
    expect(bundle.systemicEmergencySafeMode).toBe(true);
  });

  it('safe mode downgrades buy to watch', () => {
    const systemic = {
      systemicEmergencySafeMode: true,
      realTradingEnabled: false as const,
    } as Parameters<typeof applySystemicEmergencySafeModeToStrategy>[1];
    const strategy = baseInput.strategy!;
    const next = applySystemicEmergencySafeModeToStrategy(strategy, systemic);
    expect(next?.todayRecommendations[0].action).toBe('watch');
    expect(next?.todayRecommendations[0].confidencePct).toBeLessThanOrEqual(30);
  });

  it('governance snapshot on emergency halt', () => {
    const systemic = {
      emergencyGovernanceHalt: true,
      stabilitySummaryJa: 'summary',
      realTradingEnabled: false as const,
    } as Parameters<typeof applySystemicStabilityToGovernance>[1];
    const gov = { unifiedAiSummaryJa: 'old', finalDecision: 'buy', finalDecisionLabelJa: '買' } as Parameters<
      typeof applySystemicStabilityToGovernance
    >[0];
    const next = applySystemicStabilityToGovernance(gov, systemic, baseInput.compression);
    expect(next?.unifiedAiSummaryJa).toContain('Governance snapshot restore');
  });
});
