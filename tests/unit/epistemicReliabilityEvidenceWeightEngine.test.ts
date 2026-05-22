import { describe, expect, it, vi } from 'vitest';
import type { BuildEpistemicReliabilityInput } from '../../src/types/epistemicReliabilityEvidenceWeight';

vi.mock('../../src/services/epistemicReliabilityEvidenceWeightStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/epistemicReliabilityEvidenceWeightStorage')
  >();
  return {
    ...actual,
    loadEpistemicReliabilityState: vi.fn(async () => ({
      version: 1 as const,
      reliabilityTimeline: [{ at: '2020-01-01T00:00:00Z', healthScore: 70, consensusPct: 60 }],
      lastHealthScore: 70,
      lastConsensusPct: 60,
    })),
    saveEpistemicReliabilityState: vi.fn(async () => {}),
    appendReliabilityTimelinePoint: vi.fn(async () => 12),
  };
});

import { buildEpistemicReliabilityEvidenceWeightBundle } from '../../src/services/epistemicReliabilityEvidenceWeightEngine';
import {
  applyEmergencyReliabilityFallback,
  applyEpistemicReliabilityToGovernance,
  applyReliabilityDowngradeOnRollback,
  clampConfidenceForUnsupported,
} from '../../src/services/epistemicReliabilityEvidenceWeightIntegration';
import { UNSUPPORTED_CONFIDENCE_CAP } from '../../src/constants/epistemicReliabilityEvidenceWeight';

const baseInput: BuildEpistemicReliabilityInput = {
  governance: {
    generatedAt: new Date().toISOString(),
    consensusScore: 55,
    contradictionDetected: true,
    vetoLayer: 'risk',
    finalDecision: 'buy',
    finalDecisionLabelJa: '買い',
    unifiedAiSummaryJa: 'summary',
  } as unknown as BuildEpistemicReliabilityInput['governance'],
  trace: {
    explainableScore: 30,
    recursiveReasonGuardTriggered: true,
    missingEvidenceJa: ['volume'],
    generatedAt: new Date().toISOString(),
  } as BuildEpistemicReliabilityInput['trace'],
  temporal: {
    stateHealthScore: 35,
    consistencyScore: 40,
    driftScore: 22,
    governanceFresh: false,
    replayIntegrityOk: false,
    rollbackApplied: true,
    emergencyStateFreeze: false,
    replayFreshnessJa: 'stale replay',
    generatedAt: new Date().toISOString(),
  } as BuildEpistemicReliabilityInput['temporal'],
  semantic: {
    finalDecisionCoherenceScore: 45,
    unsupportedClaimsJa: ['必ず儲かる'],
    contradictionLanguageJa: ['必ず'],
    semanticFreeze: false,
    generatedAt: new Date().toISOString(),
  } as BuildEpistemicReliabilityInput['semantic'],
  stability: null,
  reactive: null,
  resource: null,
  strategy: {
    overallConfidencePct: 80,
    generatedAt: new Date().toISOString(),
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
  } as unknown as BuildEpistemicReliabilityInput['strategy'],
  finalDecision: 'buy',
};

describe('epistemicReliabilityEvidenceWeightEngine', () => {
  it('forces realTradingEnabled false and computes health', async () => {
    const bundle = await buildEpistemicReliabilityEvidenceWeightBundle(baseInput);
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.paperTradingOnly).toBe(true);
    expect(bundle.replayTrustPct).toBeLessThanOrEqual(25);
    expect(bundle.featureStatuses).toHaveLength(30);
    expect(bundle.unsupportedClaimsJa.length).toBeGreaterThan(0);
  });

  it('freezes and applies emergency fallback on low health', async () => {
    const bundle = await buildEpistemicReliabilityEvidenceWeightBundle({
      ...baseInput,
      semantic: {
        ...baseInput.semantic!,
        unsupportedClaimsJa: ['a', 'b', 'c'],
      },
    });
    expect(bundle.reliabilityFreeze).toBe(true);
    expect(bundle.emergencyFallbackApplied).toBe(true);

    const gov = applyEpistemicReliabilityToGovernance(baseInput.governance, bundle);
    expect(gov?.finalDecision).toBe('watch');

    const strat = applyEmergencyReliabilityFallback(baseInput.strategy, bundle);
    expect(strat?.todayRecommendations[0].action).toBe('watch');
  });

  it('caps confidence for unsupported claims', () => {
    const bundle = {
      unsupportedClaimsJa: ['x'],
    } as Awaited<ReturnType<typeof buildEpistemicReliabilityEvidenceWeightBundle>>;
    const strat = clampConfidenceForUnsupported(baseInput.strategy, bundle);
    expect(strat?.todayRecommendations[0].confidencePct).toBeLessThanOrEqual(
      UNSUPPORTED_CONFIDENCE_CAP,
    );
  });

  it('downgrades governance narrative on rollback', () => {
    const bundle = { reliabilityFreeze: true, reliabilityHealthScore: 30 } as Awaited<
      ReturnType<typeof buildEpistemicReliabilityEvidenceWeightBundle>
    >;
    const gov = applyReliabilityDowngradeOnRollback(baseInput.governance, baseInput.temporal, bundle);
    expect(gov?.unifiedAiSummaryJa).toContain('Reliability downgrade');
  });
});
