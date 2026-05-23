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
import { resetRuntimeConstitutionForTest, arbitrateRuntimeConstitution } from '../../../src/runtime/constitution/runtimeConstitutionIntegration';
import {
  resetRuntimeCuriosityForTest,
  tickRuntimeCuriosity,
  setLastCuriosityTickMsForTest,
} from '../../../src/runtime/curiosity/runtimeCuriosityIntegration';
import { detectReplayMonoculture } from '../../../src/runtime/curiosity/replayMonocultureDetector';
import { computeNoveltyPressure } from '../../../src/runtime/curiosity/noveltyPressureScore';
import { computeCuriosityHealth } from '../../../src/runtime/curiosity/curiosityHealthScore';
import { isMinorityEdge, countMinorityEdges } from '../../../src/runtime/curiosity/minorityEdgePreservation';
import { auditMutationAllowed, runSandboxMutation } from '../../../src/runtime/curiosity/controlledMutationSandbox';
import { detectConsensusBias } from '../../../src/runtime/curiosity/consensusBiasDetector';
import { runDeterministicSandboxReplay } from '../../../src/runtime/curiosity/sandboxEvolutionReplay';
import { resolveRedmiCuriosityContext } from '../../../src/runtime/curiosity/runtimeCuriosityEngine';
import { submitCuriosityProposal, resetCuriosityGovernanceBridgeForTest } from '../../../src/runtime/curiosity/curiosityGovernanceBridge';
import { getConstitutionalDirectives } from '../../../src/runtime/constitution/runtimeConstitutionIntegration';
import { getActiveSandbox, getReplayArchives, resetCuriosityStorageForTest } from '../../../src/runtime/curiosity/curiosityStorage';
import { computeCuriosityDecayFactor } from '../../../src/runtime/curiosity/adaptiveCuriosityDecay';
import { assessRollbackAddictionRisk } from '../../../src/runtime/curiosity/rollbackAddictionRecovery';
import { createRollbackSnapshot, resetRollbackSystemForTest } from '../../../src/runtime/governance/adaptiveRollbackSystem';
import { cremateStaleEdges } from '../../../src/runtime/metabolism/staleEdgeCremation';
import { attemptDormantPathRevival } from '../../../src/runtime/curiosity/dormantPathRevival';
import { resetHydrationLockForTest, tryAcquireHydrationLock } from '../../../src/runtime/stability/hydrationLock';

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

function seedMonocultureStore(): void {
  const store = getAdaptiveLearningStore('redmi');
  store.replayCount = 25;
  store.rootRankingHistory = {
    dominant: { count: 90, successCount: 80 },
    minor: { count: 2, successCount: 1 },
  };
  store.edges['mono'] = {
    edgeKey: 'mono',
    from: 'a',
    to: 'b',
    relation: 'causes',
    hitCount: 20,
    successfulPredictionCount: 18,
    falsePositiveCount: 0,
    decayReliability: 0.9,
    runtimeLearnedWeight: 0.9,
    confidenceEma: 0.95,
    replaySupport: 0.9,
    stability: 0.9,
    protectedInvariant: false,
  };
}

describe('runtimeCuriosity', () => {
  beforeEach(() => {
    resetRuntimeCuriosityForTest();
    resetCuriosityStorageForTest();
    resetCuriosityGovernanceBridgeForTest();
    resetAdaptiveLearningStoreForTest();
    resetRuntimeConstitutionForTest();
    resetRollbackSystemForTest();
    resetHydrationLockForTest();
    setLastCuriosityTickMsForTest(0);
  });

  it('detects replay monoculture', () => {
    seedMonocultureStore();
    const mono = detectReplayMonoculture(getAdaptiveLearningStore('redmi'));
    expect(mono.isMonoculture).toBe(true);
    expect(mono.replayMonocultureRisk).toBeGreaterThan(0.5);
  });

  it('preserves minority edges', () => {
    const store = getAdaptiveLearningStore('redmi');
    store.edges['min'] = {
      edgeKey: 'min',
      from: 'x',
      to: 'y',
      relation: 'causes',
      hitCount: 3,
      successfulPredictionCount: 2,
      falsePositiveCount: 0,
      decayReliability: 0.5,
      runtimeLearnedWeight: 0.4,
      confidenceEma: 0.5,
      replaySupport: 0.4,
      stability: 0.5,
      protectedInvariant: false,
    };
    expect(isMinorityEdge(store.edges['min'])).toBe(true);
    expect(countMinorityEdges(store)).toBeGreaterThan(0);
  });

  it('curiosity health formula bounded', () => {
    const h = computeCuriosityHealth({
      diversityRetention: 0.7,
      innovationScore: 0.6,
      minorityEdgeHealth: 0.5,
      dormantRevivalHealth: 0.3,
      entropyBalance: 0.8,
      replayMonocultureRisk: 0.2,
      fossilizationRisk: 0.1,
    });
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(100);
  });

  it('novelty pressure increases with dominance', () => {
    seedMonocultureStore();
    const n = computeNoveltyPressure(getAdaptiveLearningStore('redmi'));
    expect(n.noveltyPressure).toBeGreaterThan(0.3);
  });

  it('sandbox mutation never applies to production', () => {
    const store = getAdaptiveLearningStore('redmi');
    store.edges['e1'] = {
      edgeKey: 'e1',
      from: 'a',
      to: 'b',
      relation: 'causes',
      hitCount: 5,
      successfulPredictionCount: 3,
      falsePositiveCount: 0,
      decayReliability: 0.5,
      runtimeLearnedWeight: 0.5,
      confidenceEma: 0.5,
      replaySupport: 0.5,
      stability: 0.5,
      protectedInvariant: false,
    };
    const wBefore = store.edges['e1'].runtimeLearnedWeight;
    runSandboxMutation(store, 'edge_weight_tweak', 'probe', 3);
    expect(store.edges['e1'].runtimeLearnedWeight).toBe(wBefore);
    const sandbox = getActiveSandbox();
    expect(sandbox).not.toBeNull();
    expect(sandbox!.mutations.every((m) => m.productionApplied === false)).toBe(true);
  });

  it('blocks forbidden mutations', () => {
    expect(auditMutationAllowed('strategy rewrite attempt')).toBe(false);
    const store = getAdaptiveLearningStore('redmi');
    const r = runSandboxMutation(store, 'edge_weight_tweak', 'real_trading_enable hack', 1);
    expect(r.blocked).toBe(true);
  });

  it('deterministic sandbox replay archives', () => {
    const a = runDeterministicSandboxReplay(42, 'scenario A');
    const b = runDeterministicSandboxReplay(42, 'scenario A');
    expect(a.archived).toBe(true);
    expect(b.archived).toBe(true);
    const archives = getReplayArchives();
    expect(archives.length).toBeGreaterThan(0);
    expect(archives[0].deterministic).toBe(true);
  });

  it('dormant revival respects per-tick limit', () => {
    const store = getAdaptiveLearningStore('redmi');
    store.edges['stale'] = {
      edgeKey: 'stale',
      from: 'a',
      to: 'b',
      relation: 'causes',
      hitCount: 1,
      successfulPredictionCount: 0,
      falsePositiveCount: 0,
      decayReliability: 0.1,
      runtimeLearnedWeight: 0.1,
      confidenceEma: 0.1,
      replaySupport: 0.1,
      stability: 0.1,
      protectedInvariant: false,
    };
    cremateStaleEdges(store, true);
    const r1 = attemptDormantPathRevival(store, 5);
    const r2 = attemptDormantPathRevival(store, 6);
    expect(r1.revived + r2.revived).toBeLessThanOrEqual(1);
  });

  it('consensus bias on unanimous roots', () => {
    seedMonocultureStore();
    const c = detectConsensusBias(getAdaptiveLearningStore('redmi'));
    expect(c.unanimousRoot).toBe(true);
    expect(c.consensusBiasRisk).toBeGreaterThan(0.5);
  });

  it('curiosity decay under risk', () => {
    const f = computeCuriosityDecayFactor(
      metrics({ thermalState: 'severe', memoryTrendPct: 80 }),
      0.6,
      0.5,
    );
    expect(f).toBeLessThan(1);
  });

  it('rollback addiction risk', () => {
    const store = getAdaptiveLearningStore('redmi');
    for (let i = 0; i < 9; i += 1) createRollbackSnapshot(store, `rb_${i}`);
    expect(assessRollbackAddictionRisk(store, 0.2)).toBeGreaterThan(0.2);
  });

  it('constitution blocks production curiosity apply', () => {
    const prop = submitCuriosityProposal(
      'sandbox_mutation',
      'governance_bypass attempt',
      { ...getConstitutionalDirectives(), suppressExploration: true },
      true,
    );
    expect(prop.approvedForSandbox).toBe(false);
  });

  it('Redmi background stops curiosity', () => {
    const ctx = resolveRedmiCuriosityContext(metrics(), performance({ appForeground: false }));
    expect(ctx.mode).toBe('stopped');
    expect(ctx.allowMutation).toBe(false);
  });

  it('Redmi battery saver stops curiosity', () => {
    const ctx = resolveRedmiCuriosityContext(
      metrics({ native: { ...metrics().native, batterySaverActive: true } }),
      performance({ batterySaverActive: true }),
    );
    expect(ctx.mode).toBe('stopped');
  });

  it('Redmi thermal severe freezes sandbox', () => {
    const ctx = resolveRedmiCuriosityContext(metrics({ thermalState: 'severe' }), performance());
    expect(ctx.mode).toBe('frozen');
  });

  it('hydration pause defers sandbox', () => {
    tryAcquireHydrationLock('test-hydration');
    const ctx = resolveRedmiCuriosityContext(metrics(), performance());
    expect(ctx.mode).toBe('deferred');
  });

  it('ws reconnect storm defers exploration', () => {
    const ctx = resolveRedmiCuriosityContext(
      metrics({ websocket: { ...metrics().websocket, reconnectStormDetected: true } }),
      performance(),
    );
    expect(ctx.allowDeepExploration).toBe(false);
  });

  it('tick produces curiosity bundle in pipeline', () => {
    seedMonocultureStore();
    setLastCuriosityTickMsForTest(0);
    arbitrateRuntimeConstitution(metrics(), performance());
    const bundle = tickRuntimeCuriosity(metrics(), performance());
    expect(bundle).not.toBeNull();
    expect(bundle!.dashboard.curiosityHealth).toBeGreaterThan(0);
    expect(bundle!.productionMutationsBlocked).toBeGreaterThanOrEqual(0);
  });

});
