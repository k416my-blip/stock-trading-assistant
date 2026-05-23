import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/mobileRedmiRuntime', () => ({
  cleanupDuplicateTimers: vi.fn(),
}));
vi.mock('../../../src/runtime/orchestrator/asyncPriorityScheduler', () => ({
  cancelAsyncTasksByLabel: vi.fn(() => 0),
  compactStalePriorityQueue: vi.fn(() => 0),
}));
vi.mock('../../../src/services/explanationStormGuard', () => ({
  getExplanationCacheSize: vi.fn(() => 3),
}));
vi.mock('../../../src/native/runtime/nativeBoundaryValidation', () => ({
  observeNativeBoundaryTick: vi.fn(),
  buildNativeBoundaryValidationReport: vi.fn(() => ({
    bypassDetected: false,
    bypassDetailJa: '',
    comparison: { jsScheduleCount: 0, jsExecuteCount: 0 },
  })),
}));
vi.mock('../../../src/runtime/coordinator/resumeCoordinatorIntegration', () => ({
  observeResumeCoordinatorTick: vi.fn(),
}));

import type { RuntimeTelemetryMetricsSnapshot } from '../../../src/types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../../src/types/performanceCost';
import { resetAdaptiveLearningStoreForTest, getAdaptiveLearningStore } from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import { resetRuntimeConstitutionForTest } from '../../../src/runtime/constitution/runtimeConstitutionIntegration';
import { resetRuntimeLongevityForTest, tickRuntimeLongevity } from '../../../src/runtime/longevity/runtimeLongevityIntegration';
import { assessEntropyHealth } from '../../../src/runtime/longevity/entropyCollapseDetector';
import { detectReplayCivilization } from '../../../src/runtime/longevity/replayCivilizationBreaker';
import { detectFossilizedState } from '../../../src/runtime/longevity/fossilizedStateDetector';
import { runReplayDecayEcology } from '../../../src/runtime/longevity/replayDecayEcology';
import { preserveMutationDiversity, computeMutationDiversity } from '../../../src/runtime/longevity/mutationDiversityPreserver';
import { maybeGenerateEntropyPulse } from '../../../src/runtime/longevity/entropyPulseGenerator';
import { monitorDeterministicDrift } from '../../../src/runtime/longevity/deterministicDriftMonitor';
import { assessCuriosityFatigue } from '../../../src/runtime/longevity/curiosityFatigueRecovery';
import { reduceDashboardPressure } from '../../../src/runtime/longevity/dashboardPressureReducer';
import { triggerRuntimeImmuneResponse } from '../../../src/runtime/longevity/runtimeImmuneSystem';
import { stabilizeHeapEcology } from '../../../src/runtime/longevity/heapEcologyStabilizer';
import { resolveRedmiLongevityMode } from '../../../src/runtime/longevity/runtimeLongevityEngine';
import { resetLongevityStorageForTest, noteRootTick } from '../../../src/runtime/longevity/longevityStorage';
import { isInEntropySafeZone } from '../../../src/runtime/longevity/entropySafeZone';
import { resetRuntimeUnifiedOrchestratorForTest, runUnifiedRuntimeLayersTick, setLastUnifiedTickAtMsForTest } from '../../../src/runtime/unified/runtimeUnifiedOrchestratorIntegration';

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

function seedCivilizationStore(): void {
  const store = getAdaptiveLearningStore('redmi');
  store.replayCount = 40;
  store.rootRankingHistory = {
    dominant: { count: 95, successCount: 90 },
    minor: { count: 1, successCount: 0 },
  };
}

describe('runtimeLongevity', () => {
  beforeEach(() => {
    resetRuntimeLongevityForTest();
    resetLongevityStorageForTest();
    resetAdaptiveLearningStoreForTest();
    resetRuntimeConstitutionForTest();
    resetRuntimeUnifiedOrchestratorForTest();
    setLastUnifiedTickAtMsForTest(0);
  });

  it('entropy collapse detection', () => {
    const low = assessEntropyHealth(0.12);
    expect(low.collapseRisk).toBeGreaterThan(0.5);
    const healthy = assessEntropyHealth(0.5);
    expect(healthy.inSafeZone).toBe(true);
  });

  it('entropy safe zone', () => {
    expect(isInEntropySafeZone(0.5)).toBe(true);
    expect(isInEntropySafeZone(0.1)).toBe(false);
  });

  it('replay civilization detection', () => {
    seedCivilizationStore();
    const c = detectReplayCivilization(getAdaptiveLearningStore('redmi'));
    expect(c.replayCivilizationRisk).toBeGreaterThan(0.3);
  });

  it('fossilization after sustained ticks', () => {
    for (let i = 0; i < 185; i += 1) noteRootTick('root-a', false);
    const f = detectFossilizedState(getAdaptiveLearningStore('redmi'));
    expect(f.fossilizationRisk).toBeGreaterThan(0.4);
  });

  it('replay decay ecology', () => {
    const d = runReplayDecayEcology(0.9);
    expect(d.decayed).toBeGreaterThanOrEqual(0);
  });

  it('mutation diversity rotation', () => {
    for (let i = 0; i < 20; i += 1) preserveMutationDiversity(i % 3);
    expect(computeMutationDiversity()).toBeGreaterThan(0);
  });

  it('entropy pulse on low entropy', () => {
    const p = maybeGenerateEntropyPulse(0.18);
    expect(p.pulse).toBe(true);
    expect(p.actionsJa.length).toBeGreaterThan(0);
  });

  it('deterministic drift monitor', () => {
    const d = monitorDeterministicDrift(0);
    expect(d.deterministicDrift).toBeGreaterThanOrEqual(0);
  });

  it('curiosity fatigue', () => {
    const f = assessCuriosityFatigue({ replayCount: 35, noveltyPressure: 0.8, sandboxReplayHeavy: true });
    expect(f.curiosityFatigue).toBeGreaterThan(0.4);
  });

  it('dashboard pressure reducer', () => {
    const r = reduceDashboardPressure({ sessionMinutes: 200, asyncQueueDepth: 50, compressStrong: true });
    expect(r.thinned).toBe(true);
    expect(r.ringCap).toBeLessThan(48);
  });

  it('runtime immune response', () => {
    const i = triggerRuntimeImmuneResponse('civilization');
    expect(i.quarantine).toBe(true);
    expect(i.actionsJa).toContain('quarantine');
  });

  it('heap ecology stabilizer', () => {
    const h = stabilizeHeapEcology(metrics({ memoryTrendPct: 70 }), 130, true);
    expect(h.heapEcology).toBeGreaterThan(0);
  });

  it('Redmi background stops longevity', () => {
    expect(resolveRedmiLongevityMode(metrics(), performance({ appForeground: false }))).toBe('stopped');
  });

  it('Redmi battery saver replay decay only', () => {
    expect(
      resolveRedmiLongevityMode(
        metrics({ native: { ...metrics().native, batterySaverActive: true } }),
        performance({ batterySaverActive: true }),
      ),
    ).toBe('replay_decay_only');
  });

  it('tick produces longevity bundle', () => {
    seedCivilizationStore();
    const bundle = tickRuntimeLongevity(metrics(), performance());
    expect(bundle).not.toBeNull();
    expect(bundle!.dashboard.entropyHealth).toBeGreaterThan(0);
  });

  it('unified orchestrator includes longevity phase', () => {
    setLastUnifiedTickAtMsForTest(0);
    const { bundle } = runUnifiedRuntimeLayersTick(metrics(), performance());
    expect(bundle?.phasesCompleted).toContain('longevity');
  });
});
