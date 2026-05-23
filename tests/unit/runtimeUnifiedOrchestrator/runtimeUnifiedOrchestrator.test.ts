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
import type { RuntimeStabilitySnapshot } from '../../../src/types/runtimeStability';
import { resetAdaptiveLearningStoreForTest } from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import { resetRuntimeConstitutionForTest } from '../../../src/runtime/constitution/runtimeConstitutionIntegration';
import { resetRuntimeCuriosityForTest } from '../../../src/runtime/curiosity/runtimeCuriosityIntegration';
import { resetRuntimeMetabolismForTest } from '../../../src/runtime/metabolism/runtimeMetabolismIntegration';
import {
  resetRuntimeUnifiedOrchestratorForTest,
  runUnifiedRuntimeLayersTick,
  setLastUnifiedTickAtMsForTest,
} from '../../../src/runtime/unified/runtimeUnifiedOrchestratorIntegration';
import { isValidPhaseSequence, getFixedTickPhaseOrder } from '../../../src/runtime/unified/deterministicTickScheduler';
import { tryAcquireReplaySlot, resetReplayRaceGuardForTest } from '../../../src/runtime/unified/replayRaceGuard';
import { shouldSuppressAsyncBurst, resetAsyncBurstSuppressorForTest, beginAsyncBurstTick } from '../../../src/runtime/unified/asyncBurstSuppressor';
import { getThermalAuthority, setThermalAuthority, resetThermalAuthorityForTest } from '../../../src/runtime/unified/thermalAuthorityLayer';
import { resolveBatteryGovernance } from '../../../src/runtime/unified/batteryGovernanceLayer';
import { transitionOrchestratorState, resetDeterministicStateMachineForTest } from '../../../src/runtime/unified/deterministicStateMachine';
import { activateEmergencyBrake, isEmergencyBrakeActive } from '../../../src/runtime/unified/runtimeEmergencyBrake';
import { enterSafeMode, isSafeModeActive } from '../../../src/runtime/unified/safeModeRuntime';
import { detectDeadlockRisk, resetRuntimeDeadlockDetectorForTest, noteLayerWait, clearLayerWaits } from '../../../src/runtime/unified/runtimeDeadlockDetector';
import { enqueueDeterministicReplay, resetDeterministicReplaySequencerForTest } from '../../../src/runtime/unified/deterministicReplaySequencer';
import { isUnifiedCooldownActive, resetUnifiedCooldownManagerForTest, setUnifiedCooldown } from '../../../src/runtime/unified/unifiedCooldownManager';
import { detectCascadeRisk } from '../../../src/runtime/unified/catastrophicCascadeBreaker';

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

describe('runtimeUnifiedOrchestrator', () => {
  beforeEach(() => {
    resetRuntimeUnifiedOrchestratorForTest();
    resetAdaptiveLearningStoreForTest();
    resetRuntimeConstitutionForTest();
    resetRuntimeMetabolismForTest();
    resetRuntimeCuriosityForTest();
    resetReplayRaceGuardForTest();
    resetAsyncBurstSuppressorForTest();
    resetThermalAuthorityForTest();
    resetDeterministicStateMachineForTest();
    resetDeterministicReplaySequencerForTest();
    resetRuntimeDeadlockDetectorForTest();
    resetUnifiedCooldownManagerForTest();
    setLastUnifiedTickAtMsForTest(0);
  });

  it('fixed layer phase order', () => {
    const order = getFixedTickPhaseOrder();
    expect(order[0]).toBe('observability');
    expect(order[5]).toBe('curiosity');
    expect(order[6]).toBe('longevity');
    expect(order[7]).toBe('orchestration');
    expect(order[8]).toBe('ux');
  });

  it('valid phase sequence enforced', () => {
    expect(isValidPhaseSequence(['observability', 'self_healing', 'constitution'])).toBe(true);
    expect(isValidPhaseSequence(['constitution', 'observability'])).toBe(false);
  });

  it('deterministic replay race guard', () => {
    const a = tryAcquireReplaySlot(1000);
    const b = tryAcquireReplaySlot(1100);
    expect(a.acquired).toBe(true);
    expect(b.acquired).toBe(false);
  });

  it('async storm suppression', () => {
    beginAsyncBurstTick();
    expect(shouldSuppressAsyncBurst(metrics({ asyncQueueDepth: 80 }))).toBe(true);
  });

  it('thermal authority single source', () => {
    setThermalAuthority('severe');
    expect(getThermalAuthority()).toBe('severe');
  });

  it('battery survival only', () => {
    const g = resolveBatteryGovernance(
      metrics({ native: { ...metrics().native, batterySaverActive: true } }),
      performance({ batterySaverActive: true }),
    );
    expect(g.survivalOnly).toBe(true);
  });

  it('state machine transitions to safe mode', () => {
    activateEmergencyBrake('test');
    const s = transitionOrchestratorState({
      pressure: 0.2,
      cascadeRisk: 0.1,
      emergencyBrake: true,
      safeMode: false,
      recovering: false,
    });
    expect(s).toBe('SAFE_MODE');
    expect(isEmergencyBrakeActive()).toBe(true);
  });

  it('safe mode entry', () => {
    enterSafeMode('envelope');
    expect(isSafeModeActive()).toBe(true);
  });

  it('deadlock risk from wait chain', () => {
    for (let i = 0; i < 5; i += 1) noteLayerWait('metabolism');
    expect(detectDeadlockRisk()).toBeGreaterThan(0);
    clearLayerWaits();
  });

  it('deterministic replay sequencer uses seed', () => {
    const r = enqueueDeterministicReplay(5000);
    expect(r.allowed).toBe(true);
    expect(r.seed).toBeGreaterThanOrEqual(0);
  });

  it('unified cooldown blocks rapid ticks', () => {
    setUnifiedCooldown('global_tick', 60_000, 1000);
    expect(isUnifiedCooldownActive('global_tick', 2000)).toBe(true);
  });

  it('layers tick produces bundle with phases', () => {
    const { bundle, stabilitySnapshot } = runUnifiedRuntimeLayersTick(metrics(), performance());
    expect(stabilitySnapshot.healthScore).toBeGreaterThan(0);
    expect(bundle).not.toBeNull();
    expect(bundle!.phasesCompleted).toContain('observability');
    expect(bundle!.phasesCompleted).toContain('constitution');
    expect(bundle!.phasesCompleted).toContain('longevity');
    expect(isValidPhaseSequence(bundle!.phasesCompleted)).toBe(true);
  });

  it('background skips curiosity in skipped layers', () => {
    const { bundle } = runUnifiedRuntimeLayersTick(metrics(), performance({ appForeground: false }));
    expect(bundle?.layersSkipped).toContain('curiosity');
  });

  it('cascade risk from low health snapshot', () => {
    const risk = detectCascadeRisk({
      healthScore: 20,
      healthLabelJa: 'critical',
      metrics: {} as RuntimeStabilitySnapshot['metrics'],
      anomalies: [{ kind: 'heartbeat_gap', summaryJa: 'gap' }],
      hydrationLockActive: false,
      websocketStatusJa: 'ok',
    } as RuntimeStabilitySnapshot);
    expect(risk).toBeGreaterThan(0.3);
  });
});
