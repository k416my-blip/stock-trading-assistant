import { describe, expect, it, vi } from 'vitest';
import type { BuildExecutionRecoveryInput } from '../../src/types/executionRecoveryAdaptiveConfidence';
import {
  RECOVERY_CONFIDENCE_MAX,
  RECOVERY_OSCILLATION_SUSPEND_THRESHOLD,
} from '../../src/constants/executionRecoveryAdaptiveConfidence';

vi.mock('../../src/services/executionRecoveryAdaptiveConfidenceStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/executionRecoveryAdaptiveConfidenceStorage')
  >();
  return {
    ...actual,
    loadExecutionRecoveryState: vi.fn(async () => ({
      version: 1 as const,
      recoveryTimeline: [],
      cooldownTimeline: [],
      lastRecoveryStage: 0,
      lastThawLevel: 0,
      rollbackCooldownUntil: null,
    })),
    saveExecutionRecoveryState: vi.fn(async () => {}),
    appendRecoveryTimelinePoint: vi.fn(async () => {}),
    isRollbackCooldownActive: vi.fn(() => false),
  };
});

import { buildExecutionRecoveryAdaptiveConfidenceBundle } from '../../src/services/executionRecoveryAdaptiveConfidenceEngine';
import {
  applyAdaptiveThawToStrategy,
  applyExecutionRecoveryToGovernance,
} from '../../src/services/executionRecoveryAdaptiveConfidenceIntegration';

const healthySystemic = {
  stabilityHealthScore: 75,
  oscillationRiskPct: 20,
  recursiveRiskPct: 30,
  systemicEmergencySafeMode: false,
  cascadeIsolationActive: false,
  recursiveFreezeActive: false,
  governanceCooldownActive: false,
} as BuildExecutionRecoveryInput['systemic'];

const stressedSystemic = {
  stabilityHealthScore: 30,
  oscillationRiskPct: 75,
  recursiveRiskPct: 80,
  systemicEmergencySafeMode: true,
  cascadeIsolationActive: true,
  recursiveFreezeActive: true,
  governanceCooldownActive: true,
} as BuildExecutionRecoveryInput['systemic'];

const baseInput: BuildExecutionRecoveryInput = {
  governance: { consensusScore: 70, unifiedAiSummaryJa: 'ok', finalDecision: 'hold' } as unknown as BuildExecutionRecoveryInput['governance'],
  temporal: { replayIntegrityOk: true, rollbackApplied: false } as unknown as BuildExecutionRecoveryInput['temporal'],
  semantic: { finalDecisionCoherenceScore: 65, semanticFreeze: false } as unknown as BuildExecutionRecoveryInput['semantic'],
  epistemic: { reliabilityHealthScore: 70, replayTrustPct: 80, reliabilityFreeze: false } as unknown as BuildExecutionRecoveryInput['epistemic'],
  arbitration: { arbitrationHealthScore: 68, intentFreeze: false } as unknown as BuildExecutionRecoveryInput['arbitration'],
  reflection: {
    contradictionTrendPct: 10,
    unsupportedTrendPct: 8,
    rollbackDependencyPct: 10,
    reflectionConsensusPct: 72,
    selfCritiqueScore: 75,
    reflectionFreeze: false,
    metaEmergencyShutdown: false,
  } as unknown as BuildExecutionRecoveryInput['reflection'],
  compression: { recoveryHealthPct: 70, replayCorruptionDetected: false, replayIsolated: false, cognitiveStabilityFreeze: false } as unknown as BuildExecutionRecoveryInput['compression'],
  systemic: healthySystemic,
  trace: null,
  strategy: {
    todayRecommendations: [
      {
        symbol: 'AAPL',
        action: 'buy',
        intent: 'buy',
        confidencePct: 20,
        whyProposedJa: 't',
        analystExplanationJa: 't',
      },
    ],
  } as unknown as BuildExecutionRecoveryInput['strategy'],
  stability: null,
  reactive: null,
  resource: null,
  finalDecision: 'hold',
};

describe('executionRecoveryAdaptiveConfidenceEngine', () => {
  it('forces realTradingEnabled false and 30 features', async () => {
    const bundle = await buildExecutionRecoveryAdaptiveConfidenceBundle(baseInput);
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.paperTradingOnly).toBe(true);
    expect(bundle.featureStatuses).toHaveLength(30);
  });

  it('allows gradual thaw when healthy', async () => {
    const bundle = await buildExecutionRecoveryAdaptiveConfidenceBundle(baseInput);
    expect(bundle.recoveryBlocked).toBe(false);
    expect(bundle.thawLevelPct).toBeGreaterThan(35);
    expect(bundle.recoveryStage).toBeGreaterThanOrEqual(1);
  });

  it('blocks recovery under systemic emergency', async () => {
    const bundle = await buildExecutionRecoveryAdaptiveConfidenceBundle({
      ...baseInput,
      systemic: stressedSystemic,
      temporal: { rollbackApplied: true, replayIntegrityOk: false } as unknown as BuildExecutionRecoveryInput['temporal'],
    });
    expect(bundle.recoveryBlocked).toBe(true);
    expect(bundle.recoverySuspended || bundle.oscillationRiskPct > RECOVERY_OSCILLATION_SUSPEND_THRESHOLD).toBe(
      true,
    );
  });

  it('respects safe mode in strategy integration', () => {
    const recovery = {
      safeRecovery: false,
      recoveryBlocked: true,
      recoveryStage: 4,
      thawState: 'buy_watch',
      adaptiveConfidencePct: 80,
      recoveryHealthPct: 80,
      cooldownActive: true,
    } as Parameters<typeof applyAdaptiveThawToStrategy>[1];
    const next = applyAdaptiveThawToStrategy(baseInput.strategy!, recovery, stressedSystemic);
    expect(next?.todayRecommendations[0].action).not.toBe('buy');
    expect(next?.todayRecommendations[0].confidencePct).toBeLessThanOrEqual(RECOVERY_CONFIDENCE_MAX);
  });

  it('does not override governance finalDecision', () => {
    const gov = {
      finalDecision: 'buy',
      finalDecisionLabelJa: '買',
      unifiedAiSummaryJa: 'base',
    } as Parameters<typeof applyExecutionRecoveryToGovernance>[0];
    const recovery = {
      safeRecovery: true,
      recoveryHealthPct: 70,
      thawLevelPct: 70,
      recoveryStage: 4,
      recoveryBlocked: false,
      cooldownActive: false,
      partialRestoreActive: true,
      cooldownStatusJa: 'none',
    } as Parameters<typeof applyExecutionRecoveryToGovernance>[1];
    const next = applyExecutionRecoveryToGovernance(gov, recovery, null);
    expect(next?.finalDecision).toBe('buy');
    expect(next?.unifiedAiSummaryJa).toContain('Recovery health');
  });
});
