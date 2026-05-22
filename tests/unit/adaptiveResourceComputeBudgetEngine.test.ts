import { describe, expect, it, vi } from 'vitest';
import type { BuildAdaptiveResourceComputeBudgetInput } from '../../src/types/adaptiveResourceComputeBudget';

vi.mock('../../src/services/adaptiveResourceComputeBudgetStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/adaptiveResourceComputeBudgetStorage')>();
  return {
    ...actual,
    loadResourceBudgetState: vi.fn(async () => ({
      version: 1 as const,
      computeTimeline: [],
      lastSnapshotFingerprint: null,
      traceBytesEstimate: 0,
      replayEntryCount: 0,
      incrementalReplayHashes: [],
      gcHintsIssued: 0,
    })),
    saveResourceBudgetState: vi.fn(async () => {}),
    appendComputeTimelinePoint: vi.fn(async () => {}),
    issueGarbageCollectionHint: vi.fn(async () => 1),
  };
});

vi.mock('../../src/services/adaptiveResourceComputeBudgetRuntime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/adaptiveResourceComputeBudgetRuntime')>();
  return {
    ...actual,
    getResourceRuntimeMetrics: vi.fn(() => ({
      throttledEvents: 2,
      droppedRecomputes: 1,
      aiTickThrottles: 1,
      visibilityPaused: false,
      layersSkippedThisCycle: 3,
      renderCostScore: 12,
    })),
  };
});

import { buildAdaptiveResourceComputeBudgetBundle } from '../../src/services/adaptiveResourceComputeBudgetEngine';
import { shouldRunLayerWithComputeBudget } from '../../src/services/adaptiveResourceComputeBudgetRuntime';

const baseInput: BuildAdaptiveResourceComputeBudgetInput = {
  batterySaverEnabled: false,
  appForeground: true,
  memoryPressure: false,
  offlineMode: false,
  renderBudgetInFlight: 1,
  renderBudgetMax: 4,
  renderBudgetBlocked: 0,
  proactiveQueueSize: 12,
  layerEnabled: {
    stability: true,
    governance: true,
    data_reliability: true,
    cognitive_trace: true,
    autonomous: true,
  },
  reactiveDroppedTotal: 3,
  reactiveRecomputePerSec: 2,
  traceJsonLength: 60_000,
  replayEntryCount: 5,
};

describe('adaptiveResourceComputeBudgetEngine', () => {
  it('builds resource bundle with health score and dashboard fields', async () => {
    const bundle = await buildAdaptiveResourceComputeBudgetBundle(baseInput);
    expect(bundle.paperTradingOnly).toBe(true);
    expect(bundle.resourceHealthScore).toBeGreaterThan(0);
    expect(bundle.activeLayers.length).toBeGreaterThan(0);
    expect(bundle.renderBudgetMax).toBe(4);
    expect(bundle.traceSizeBytes).toBeLessThan(60_000);
    expect(bundle.explainabilitySamplingActive).toBe(true);
    expect(bundle.computeTimeline.length).toBeGreaterThan(0);
  });

  it('emergency cut allows only critical tiers', () => {
    const allows = shouldRunLayerWithComputeBudget('stability', {
      batterySaver: false,
      appForeground: true,
      memoryPressure: false,
      offlineMode: false,
      emergencyComputeCut: true,
      aiSleepMode: false,
      proactiveQueueSize: 0,
    });
    const denies = shouldRunLayerWithComputeBudget('autonomous', {
      batterySaver: false,
      appForeground: true,
      memoryPressure: false,
      offlineMode: false,
      emergencyComputeCut: true,
      aiSleepMode: false,
      proactiveQueueSize: 0,
    });
    expect(allows).toBe(true);
    expect(denies).toBe(false);
  });

  it('battery saver + background sleeps low tier layers', () => {
    const denies = shouldRunLayerWithComputeBudget('cognitive_trace', {
      batterySaver: true,
      appForeground: false,
      memoryPressure: false,
      offlineMode: false,
      emergencyComputeCut: false,
      aiSleepMode: true,
      proactiveQueueSize: 0,
    });
    expect(denies).toBe(false);
  });
});
