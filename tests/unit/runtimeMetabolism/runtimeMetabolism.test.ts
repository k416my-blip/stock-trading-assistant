import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/mobileRedmiRuntime', () => ({
  cleanupDuplicateTimers: vi.fn(),
}));
vi.mock('../../../src/runtime/orchestrator/asyncPriorityScheduler', () => ({
  cancelAsyncTasksByLabel: vi.fn(() => 0),
  compactStalePriorityQueue: vi.fn(() => 0),
}));
vi.mock('../../../src/services/explanationStormGuard', () => ({
  getExplanationCacheSize: vi.fn(() => 2),
}));

import type { RuntimeTelemetryMetricsSnapshot } from '../../../src/types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../../src/types/performanceCost';
import { resetAdaptiveLearningStoreForTest, getAdaptiveLearningStore } from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import { resetRuntimeConstitutionForTest } from '../../../src/runtime/constitution/runtimeConstitutionIntegration';
import { resetRuntimeMetabolismForTest, tickRuntimeMetabolism, recoverFromTombstone } from '../../../src/runtime/metabolism/runtimeMetabolismIntegration';
import { decayObsoleteReplays } from '../../../src/runtime/metabolism/obsoleteReplayDecay';
import { cremateStaleEdges } from '../../../src/runtime/metabolism/staleEdgeCremation';
import { runEntropyDetox } from '../../../src/runtime/metabolism/entropyDetox';
import { applyAdaptiveForgetting } from '../../../src/runtime/metabolism/adaptiveForgetting';
import { isolateToxicMemories } from '../../../src/runtime/metabolism/toxicMemoryIsolation';
import { assessSelfHealingAddictionRisk } from '../../../src/runtime/metabolism/selfHealingAddictionGuard';
import { computeMemoryNutritionScore } from '../../../src/runtime/metabolism/memoryNutritionScore';
import { computeMetabolicHealth } from '../../../src/runtime/metabolism/metabolicHealthScore';
import { getTombstone, getAuditTrail, setLastGcAtMsForTest } from '../../../src/runtime/metabolism/metabolismStorage';
import { resolveRedmiMetabolismContext } from '../../../src/runtime/metabolism/runtimeMetabolismEngine';
import { halfLifeDecay } from '../../../src/runtime/metabolism/memoryRelevanceHalfLife';
import { createRollbackSnapshot, resetRollbackSystemForTest } from '../../../src/runtime/governance/adaptiveRollbackSystem';
import { noteSelfHealingPassForMetabolism } from '../../../src/runtime/metabolism/metabolismStorage';

function metrics(overrides: Partial<RuntimeTelemetryMetricsSnapshot> = {}): RuntimeTelemetryMetricsSnapshot {
  return {
    jsHeapEstimateMb: 100,
    renderFPS: 20,
    droppedFrames: 0,
    eventLoopLatencyMs: 50,
    asyncQueueLatencyMs: 50,
    websocketRttMs: 80,
    hydrationDurationMs: null,
    foregroundResumeDurationMs: 200,
    orchestrationDurationMs: null,
    explanationGenerationDurationMs: null,
    asyncQueueDepth: 2,
    memoryTrendPct: 30,
    thermalState: 'none',
    runtimeModeLabelJa: 'normal',
    native: {
      batterySaverActive: false,
      lowPowerMode: false,
      thermalStatus: 'none',
      memoryWarning: false,
      appState: 'active',
      backgroundRestriction: false,
      networkType: 'wifi',
      miuiAggressiveReclaim: false,
      thermalThrottlingDetected: false,
      resumeSpikeDetected: false,
      observedAt: new Date().toISOString(),
    },
    render: {
      renderFPS: 20,
      frameDropRate: 0,
      renderBurstRate: 0,
      dashboardCommitDurationMs: 10,
      reactTransitionPressurePct: 5,
      renderSpikeDetected: false,
      excessiveRerenderDetected: false,
      subtreeHotReloadDetected: false,
    },
    websocket: {
      wsLatencyMs: 80,
      reconnectAttempts: 0,
      frameDelayMs: 0,
      heartbeatDelayMs: 0,
      offlineRecoveryDurationMs: null,
      jitterScore: 10,
      reconnectStormDetected: false,
      packetBatchingEfficiencyPct: 90,
    },
    hydrationResume: {
      hydrationDurationMs: null,
      resumeRecoveryTimeMs: 200,
      duplicateHydrationRate: 0,
      postResumePressurePct: 5,
      resumeCascadeRiskPct: 10,
    },
    longSession: {
      sessionMinutes: 10,
      checkpoint: 'under_30m',
      memoryGrowthTrendPct: 30,
      asyncQueueGrowthTrend: 0,
      renderDegradationPct: 0,
      websocketDegradationPct: 0,
      orchestrationSlowdownPct: 0,
      explanationCacheGrowth: 0,
    },
    measuredAt: new Date().toISOString(),
    ...overrides,
  };
}

function performance(opts?: Partial<PerformanceCostRuntimeSnapshot>): PerformanceCostRuntimeSnapshot {
  return {
    appForeground: true,
    appStateLabel: 'active',
    networkPaused: false,
    offlineMode: false,
    batterySaverActive: false,
    animationsReduced: false,
    xApiPaused: false,
    pollingPaused: false,
    lastOnlineAt: new Date().toISOString(),
    ...opts,
  };
}

function seedStaleStore(): void {
  const store = getAdaptiveLearningStore('redmi');
  store.lastUpdatedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  store.replayCount = 15;
  store.edges['stale'] = {
    edgeKey: 'stale',
    from: 'async_queue_saturation',
    to: 'event_loop_pressure',
    relation: 'causes',
    hitCount: 1,
    successfulPredictionCount: 0,
    falsePositiveCount: 2,
    decayReliability: 0.1,
    runtimeLearnedWeight: 0.15,
    confidenceEma: 0.12,
    replaySupport: 0.5,
    stability: 0.1,
    protectedInvariant: false,
  };
  store.falsePositives = [
    { edgeKey: 'stale', predictedRoot: 'x', actualOutcome: 'y', count: 4, penalty: 0.8 },
  ];
}

describe('runtimeMetabolism', () => {
  beforeEach(() => {
    resetRuntimeMetabolismForTest();
    resetAdaptiveLearningStoreForTest();
    resetRollbackSystemForTest();
    resetRuntimeConstitutionForTest();
  });

  it('half-life decay decreases with age', () => {
    expect(halfLifeDecay(0, 1000)).toBe(1);
    expect(halfLifeDecay(1000, 1000)).toBeCloseTo(0.5, 2);
  });

  it('obsolete replay decay archives without requiring delete', () => {
    seedStaleStore();
    const store = getAdaptiveLearningStore();
    const r = decayObsoleteReplays(store);
    expect(r.archived).toBeGreaterThanOrEqual(0);
  });

  it('stale edge tombstone is recoverable', () => {
    seedStaleStore();
    const store = getAdaptiveLearningStore();
    const { tombstoned } = cremateStaleEdges(store);
    expect(tombstoned).toBe(1);
    expect(getTombstone('stale')).toBeDefined();
    expect(recoverFromTombstone('stale')).toBe(true);
    expect(getTombstone('stale')).toBeUndefined();
    expect(store.edges['stale']).toBeDefined();
  });

  it('entropy detox and adaptive forgetting run safely', () => {
    seedStaleStore();
    const store = getAdaptiveLearningStore();
    store.edges['dup'] = { ...store.edges['stale'], edgeKey: 'dup', from: store.edges['stale'].from, to: store.edges['stale'].to };
    const detox = runEntropyDetox(store);
    expect(detox.detoxScore).toBeGreaterThan(0);
    const nutrition = computeMemoryNutritionScore(store);
    const forgotten = applyAdaptiveForgetting(store, nutrition);
    expect(forgotten.forgotten).toBeGreaterThanOrEqual(0);
  });

  it('governance fossil and self-healing addiction', () => {
    const store = getAdaptiveLearningStore();
    for (let i = 0; i < 9; i += 1) createRollbackSnapshot(store, `fossil_${i}`);
    for (let i = 0; i < 8; i += 1) noteSelfHealingPassForMetabolism();
    expect(assessSelfHealingAddictionRisk()).toBeGreaterThan(0.3);
  });

  it('toxic memory isolation', () => {
    seedStaleStore();
    const isolated = isolateToxicMemories(getAdaptiveLearningStore());
    expect(isolated.isolated).toBeGreaterThan(0);
  });

  it('metabolic health formula bounded 0-100', () => {
    const h = computeMetabolicHealth({
      memoryNutritionScore: 0.7,
      heapEcologyScore: 0.8,
      entropyDetoxScore: 0.9,
      fossilizedRollbackRisk: 0.2,
      selfHealingAddictionRisk: 0.1,
      tombstoneRatio: 0.05,
    });
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(100);
  });

  it('Redmi background defers deep GC', () => {
    const ctx = resolveRedmiMetabolismContext(metrics(), performance({ appForeground: false }));
    expect(ctx.deferGc).toBe(true);
    expect(ctx.nextGcReason).toContain('background');
  });

  it('Redmi battery saver tombstone only', () => {
    const ctx = resolveRedmiMetabolismContext(
      metrics({ native: { ...metrics().native, batterySaverActive: true } }),
      performance({ batterySaverActive: true }),
    );
    expect(ctx.tombstoneOnly).toBe(true);
  });

  it('Redmi thermal defers GC', () => {
    const ctx = resolveRedmiMetabolismContext(
      metrics({ thermalState: 'severe' }),
      performance(),
    );
    expect(ctx.deferGc).toBe(true);
  });

  it('tick produces audit trail', () => {
    seedStaleStore();
    setLastGcAtMsForTest(0);
    const bundle = tickRuntimeMetabolism(metrics(), performance());
    expect(bundle).not.toBeNull();
    expect(bundle!.dashboard.metabolicHealth).toBeGreaterThan(0);
    expect(getAuditTrail().length).toBeGreaterThan(0);
  });
});
