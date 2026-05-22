import { describe, expect, it, vi } from 'vitest';
import type { BuildMetaCognitiveReflectionInput } from '../../src/types/metaCognitiveRiskReflectionSelfCritique';

vi.mock('../../src/services/metaCognitiveRiskReflectionSelfCritiqueStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/metaCognitiveRiskReflectionSelfCritiqueStorage')
  >();
  return {
    ...actual,
    loadMetaCognitiveReflectionState: vi.fn(async () => ({
      version: 1 as const,
      driftTimeline: [{ at: '2020-01-01', confidenceDriftPct: 10, metaConfidencePct: 55, fatigueScore: 30 }],
      rollbackCount: 2,
      freezeCount: 1,
      lastMetaConfidence: 55,
    })),
    saveMetaCognitiveReflectionState: vi.fn(async () => {}),
    appendDriftTimelinePoint: vi.fn(async () => ({
      driftDelta: 5,
      rollbackCount: 3,
      freezeCount: 2,
    })),
  };
});

import { buildMetaCognitiveRiskReflectionSelfCritiqueBundle } from '../../src/services/metaCognitiveRiskReflectionSelfCritiqueEngine';
import {
  applyMetaCognitiveReflectionToGovernance,
  applyMetaCognitiveReflectionToStrategy,
  applyReflectionSafeModeToStrategy,
} from '../../src/services/metaCognitiveRiskReflectionSelfCritiqueIntegration';
import { META_CONFIDENCE_SAFE_THRESHOLD } from '../../src/constants/metaCognitiveRiskReflectionSelfCritique';

const baseInput: BuildMetaCognitiveReflectionInput = {
  governance: {
    finalDecision: 'buy',
    finalDecisionLabelJa: '買い',
    consensusScore: 80,
    contradictionDetected: true,
    unifiedAiSummaryJa: '必ず上がる強気チャンス',
  } as unknown as BuildMetaCognitiveReflectionInput['governance'],
  trace: { explainableScore: 40, missingEvidenceJa: ['a', 'b', 'c'] } as unknown as BuildMetaCognitiveReflectionInput['trace'],
  temporal: { rollbackApplied: true } as unknown as BuildMetaCognitiveReflectionInput['temporal'],
  semantic: {
    semanticFreeze: false,
    unsupportedClaimsJa: ['必ず'],
    contradictionLanguageJa: ['矛盾'],
    finalDecisionCoherenceScore: 40,
  } as unknown as BuildMetaCognitiveReflectionInput['semantic'],
  epistemic: {
    reliabilityHealthScore: 35,
    reliabilityFreeze: true,
    replayTrustPct: 20,
    unsupportedClaimsJa: ['x'],
  } as unknown as BuildMetaCognitiveReflectionInput['epistemic'],
  arbitration: {
    emergencySafeMode: true,
    arbitrationConflicts: [{}, {}, {}] as never,
    deadlockDetected: false,
    arbitrationHealthScore: 35,
  } as unknown as BuildMetaCognitiveReflectionInput['arbitration'],
  strategy: {
    overallConfidencePct: 90,
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
  } as unknown as BuildMetaCognitiveReflectionInput['strategy'],
  stability: null,
  reactive: null,
  resource: null,
  finalDecision: 'buy',
};

describe('metaCognitiveRiskReflectionSelfCritiqueEngine', () => {
  it('forces realTradingEnabled false and 30 features', async () => {
    const bundle = await buildMetaCognitiveRiskReflectionSelfCritiqueBundle(baseInput);
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.featureStatuses).toHaveLength(30);
    expect(bundle.reflectionSafeMode).toBe(true);
  });

  it('meta confidence low triggers safe mode on governance', async () => {
    const bundle = await buildMetaCognitiveRiskReflectionSelfCritiqueBundle(baseInput);
    expect(bundle.metaConfidencePct).toBeLessThan(META_CONFIDENCE_SAFE_THRESHOLD + 5);
    const gov = applyMetaCognitiveReflectionToGovernance(baseInput.governance, bundle);
    expect(gov?.finalDecision).toBe('watch');
  });

  it('reflection safe mode downgrades strategy', async () => {
    const bundle = await buildMetaCognitiveRiskReflectionSelfCritiqueBundle(baseInput);
    const strat = applyReflectionSafeModeToStrategy(baseInput.strategy, bundle);
    expect(strat?.todayRecommendations[0].action).toBe('watch');
  });

  it('conservative recovery and contradiction downgrade apply', async () => {
    const bundle = await buildMetaCognitiveRiskReflectionSelfCritiqueBundle(baseInput);
    expect(bundle.conservativeRecoveryActive).toBe(true);
    const strat = applyMetaCognitiveReflectionToStrategy(baseInput.strategy, bundle);
    expect(strat?.todayRecommendations[0].confidencePct).toBeLessThanOrEqual(45);
  });
});
