import { describe, expect, it, vi } from 'vitest';
import type { BuildMemoryCompressionInput } from '../../src/types/recursiveMemoryCompressionStrategicAbstraction';
import { MEMORY_SATURATION_THRESHOLD } from '../../src/constants/recursiveMemoryCompressionStrategicAbstraction';

vi.mock('../../src/services/recursiveMemoryCompressionStrategicAbstractionStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/recursiveMemoryCompressionStrategicAbstractionStorage')
  >();
  return {
    ...actual,
    loadMemoryCompressionState: vi.fn(async () => ({
      version: 1 as const,
      compressedTimeline: [],
      metaSnapshots: [],
      rawBytesEstimate: 5000,
      compressedBytesEstimate: 2000,
    })),
    saveMemoryCompressionState: vi.fn(async () => {}),
    persistCompressionCycle: vi.fn(async () => ({ compressionRatioPct: 55 })),
  };
});

import { buildRecursiveMemoryCompressionStrategicAbstractionBundle } from '../../src/services/recursiveMemoryCompressionStrategicAbstractionEngine';
import {
  applyMemoryCompressionToGovernance,
  applyCompressionStabilityFreezeToStrategy,
} from '../../src/services/recursiveMemoryCompressionStrategicAbstractionIntegration';

const baseInput: BuildMemoryCompressionInput = {
  governance: {
    finalDecision: 'buy',
    unifiedAiSummaryJa: '強気必ず上がる'.repeat(20),
    consensusScore: 80,
  } as unknown as BuildMemoryCompressionInput['governance'],
  temporal: { replayIntegrityOk: false, rollbackApplied: true } as unknown as BuildMemoryCompressionInput['temporal'],
  epistemic: { replayTrustPct: 15, reliabilityTimeline: [{}, {}, {}] as never } as unknown as BuildMemoryCompressionInput['epistemic'],
  reflection: {
    fatigueScore: 75,
    driftTimeline: [{}, {}, {}, {}] as never,
    reflectionFreeze: false,
  } as unknown as BuildMemoryCompressionInput['reflection'],
  arbitration: { arbitrationTimeline: [{}, {}] as never, arbitrationConflicts: [{}] as never } as unknown as BuildMemoryCompressionInput['arbitration'],
  semantic: { unsupportedClaimsJa: ['x'], contradictionLanguageJa: ['c'], semanticSummaryJa: 'test' } as unknown as BuildMemoryCompressionInput['semantic'],
  resource: { replaySizeBytes: 60000, aiLoadPct: 70, traceSizeBytes: 10000 } as unknown as BuildMemoryCompressionInput['resource'],
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
  } as unknown as BuildMemoryCompressionInput['strategy'],
  trace: { reasoningChainJa: ['a'.repeat(500)] } as unknown as BuildMemoryCompressionInput['trace'],
  stability: null,
  reactive: null,
  finalDecision: 'buy',
};

describe('recursiveMemoryCompressionStrategicAbstractionEngine', () => {
  it('forces realTradingEnabled false and 30 features', async () => {
    const bundle = await buildRecursiveMemoryCompressionStrategicAbstractionBundle(baseInput);
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.featureStatuses).toHaveLength(30);
    expect(bundle.replayCorruptionDetected).toBe(true);
    expect(bundle.replayIsolated).toBe(true);
  });

  it('safe compression mode when saturation high', async () => {
    const bundle = await buildRecursiveMemoryCompressionStrategicAbstractionBundle(baseInput);
    if (bundle.memorySaturationPct > MEMORY_SATURATION_THRESHOLD) {
      expect(bundle.safeCompressionMode).toBe(true);
    }
    expect(bundle.abstractedNarrativeJa.length).toBeGreaterThan(0);
  });

  it('stability freeze downgrades buy', async () => {
    const bundle = await buildRecursiveMemoryCompressionStrategicAbstractionBundle(baseInput);
    const frozen = { ...bundle, cognitiveStabilityFreeze: true };
    const strat = applyCompressionStabilityFreezeToStrategy(baseInput.strategy, frozen);
    expect(strat?.todayRecommendations[0].action).toBe('watch');
  });

  it('emergency collapse blocks buy on governance', async () => {
    const bundle = await buildRecursiveMemoryCompressionStrategicAbstractionBundle(baseInput);
    const collapsed = { ...bundle, emergencyContextCollapse: true };
    const gov = applyMemoryCompressionToGovernance(baseInput.governance, collapsed);
    expect(gov?.finalDecision).toBe('watch');
  });
});
