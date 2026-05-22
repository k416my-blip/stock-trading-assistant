import { describe, expect, it, vi } from 'vitest';
import type { BuildCognitiveGoalArbitrationInput } from '../../src/types/cognitiveGoalArbitrationIntentPriority';

vi.mock('../../src/services/cognitiveGoalArbitrationIntentPriorityStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/cognitiveGoalArbitrationIntentPriorityStorage')
  >();
  return {
    ...actual,
    loadCognitiveGoalArbitrationState: vi.fn(async () => ({
      version: 1 as const,
      arbitrationTimeline: [],
      lastHealthScore: null,
      lastPriorityDrift: null,
    })),
    saveCognitiveGoalArbitrationState: vi.fn(async () => {}),
    appendArbitrationTimelinePoint: vi.fn(async () => 10),
  };
});

import { buildCognitiveGoalArbitrationIntentPriorityBundle } from '../../src/services/cognitiveGoalArbitrationIntentPriorityEngine';
import {
  applyCognitiveGoalArbitrationToGovernance,
  applyCognitiveGoalArbitrationToStrategy,
  applyEmergencySafeModeToStrategy,
} from '../../src/services/cognitiveGoalArbitrationIntentPriorityIntegration';

const baseInput: BuildCognitiveGoalArbitrationInput = {
  governance: {
    finalDecision: 'buy',
    finalDecisionLabelJa: '買い',
    vetoLayer: 'risk',
    contradictionDetected: true,
    unifiedAiSummaryJa: 'summary',
  } as unknown as BuildCognitiveGoalArbitrationInput['governance'],
  temporal: {
    rollbackApplied: true,
    replayIntegrityOk: false,
    emergencyStateFreeze: false,
  } as unknown as BuildCognitiveGoalArbitrationInput['temporal'],
  semantic: {
    semanticFreeze: true,
    unsupportedClaimsJa: ['必ず儲かる'],
    emergencyNarrativeFallbackJa: 'freeze narrative',
  } as unknown as BuildCognitiveGoalArbitrationInput['semantic'],
  epistemic: {
    reliabilityHealthScore: 30,
    reliabilityFreeze: true,
    replayTrustPct: 20,
  } as unknown as BuildCognitiveGoalArbitrationInput['epistemic'],
  resource: { emergencyComputeCut: true } as unknown as BuildCognitiveGoalArbitrationInput['resource'],
  reactive: { burstProtectionActive: true, renderBudgetBlocked: 10 } as unknown as BuildCognitiveGoalArbitrationInput['reactive'],
  trace: null,
  strategy: {
    todayRecommendations: [
      {
        symbol: 'AAPL',
        action: 'buy',
        intent: 'buy',
        confidencePct: 90,
        whyProposedJa: 'test',
        analystExplanationJa: 'test',
      },
    ],
  } as unknown as BuildCognitiveGoalArbitrationInput['strategy'],
  stability: null,
  finalDecision: 'buy',
};

describe('cognitiveGoalArbitrationIntentPriorityEngine', () => {
  it('forces realTradingEnabled false and builds 30 features', async () => {
    const bundle = await buildCognitiveGoalArbitrationIntentPriorityBundle(baseInput);
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.featureStatuses).toHaveLength(30);
    expect(bundle.emergencySafeMode).toBe(true);
    expect(bundle.arbitrationConflicts.length).toBeGreaterThan(0);
  });

  it('semantic freeze blocks buy on governance', async () => {
    const bundle = await buildCognitiveGoalArbitrationIntentPriorityBundle(baseInput);
    const gov = applyCognitiveGoalArbitrationToGovernance(
      baseInput.governance,
      bundle,
      baseInput.semantic,
      baseInput.temporal,
    );
    expect(gov?.finalDecision).toBe('watch');
  });

  it('safe mode downgrades strategy to watch/hold', async () => {
    const bundle = await buildCognitiveGoalArbitrationIntentPriorityBundle(baseInput);
    const strat = applyEmergencySafeModeToStrategy(baseInput.strategy, bundle);
    expect(strat?.todayRecommendations[0].action).toBe('watch');
  });

  it('applies downgrade flow on rollback', async () => {
    const bundle = await buildCognitiveGoalArbitrationIntentPriorityBundle(baseInput);
    expect(bundle.downgradeReasonJa).toBeTruthy();
    const strat = applyCognitiveGoalArbitrationToStrategy(baseInput.strategy, bundle);
    expect(strat?.todayRecommendations[0].action).toBe('watch');
  });
});
