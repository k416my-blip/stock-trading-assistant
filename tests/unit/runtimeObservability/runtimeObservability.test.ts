import { beforeEach, describe, expect, it } from 'vitest';
import type { RuntimeTelemetryMetricsSnapshot } from '../../../src/types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../../src/types/performanceCost';
import { resetRuntimeEventJournalForTest, getJournalStats } from '../../../src/runtime/observability/runtimeEventJournal';
import { resetRuntimeSnapshotsForTest, getRuntimeSnapshots } from '../../../src/runtime/observability/runtimeSnapshotSystem';
import { resetLongSessionSamplesForTest, recordLongSessionSample, analyzeLongSessionDegradation } from '../../../src/runtime/observability/longSessionDegradationAnalyzer';
import { runFailureReplay } from '../../../src/runtime/observability/failureReplayMode';
import { reconstructFailureTimeline } from '../../../src/runtime/observability/timelineReconstructionEngine';
import { analyzeAsyncStarvation } from '../../../src/runtime/observability/asyncStarvationAnalyzer';
import { buildHydrationForensicChain } from '../../../src/runtime/observability/hydrationRaceForensics';
import { isObservabilityPayloadAllowed } from '../../../src/runtime/observability/safeObservabilityConstraints';
import {
  buildRuntimeObservabilityBundle,
  buildRedmiNote13ProObservabilityReport,
  observeRuntimeObservabilityTick,
  resetRuntimeObservabilityForTest,
} from '../../../src/runtime/observability/runtimeObservabilityIntegration';
import { JOURNAL_RING_CAPACITY, JOURNAL_MEMORY_CAP_BYTES } from '../../../src/constants/runtimeObservability';

function metrics(overrides: Partial<RuntimeTelemetryMetricsSnapshot> = {}): RuntimeTelemetryMetricsSnapshot {
  return {
    jsHeapEstimateMb: 120,
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

function performance(): PerformanceCostRuntimeSnapshot {
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
  };
}

describe('runtimeObservability', () => {
  beforeEach(() => {
    resetRuntimeObservabilityForTest();
  });

  it('rejects forbidden observability payloads', () => {
    expect(isObservabilityPayloadAllowed('queue depth 12')).toBe(true);
    expect(isObservabilityPayloadAllowed('user prompt leaked')).toBe(false);
    expect(isObservabilityPayloadAllowed('normal', 'stealth_telemetry')).toBe(false);
  });

  it('journal respects ring capacity and memory cap', () => {
    for (let i = 0; i < JOURNAL_RING_CAPACITY + 100; i += 1) {
      observeRuntimeObservabilityTick(
        metrics({ asyncQueueDepth: i % 20, eventLoopLatencyMs: 30 }),
        performance(),
      );
    }
    const stats = getJournalStats();
    expect(stats.count).toBeLessThanOrEqual(JOURNAL_RING_CAPACITY);
    expect(stats.bytesEstimate).toBeLessThanOrEqual(JOURNAL_MEMORY_CAP_BYTES + 4096);
  });

  it('reconstructs async starvation from replay', () => {
    const replay = runFailureReplay('async_starvation');
    expect(replay.deterministic).toBe(true);
    const top = replay.timeline.rootCauseCandidates[0];
    expect(top?.kind).toBe('async_starvation');
    const starvation = analyzeAsyncStarvation({ queueDepth: 28, queueLagMs: 450 });
    expect(starvation.phase).toBe('STARVATION_CRITICAL');
  });

  it('reconnect storm replay yields websocket root candidate', () => {
    const replay = runFailureReplay('reconnect_storm');
    expect(replay.eventsGenerated).toBeGreaterThanOrEqual(10);
    const kinds = replay.timeline.rootCauseCandidates.map((c) => c.kind);
    expect(kinds).toContain('reconnect_storm');
  });

  it('hydration race forensic chain detects overlap', () => {
    runFailureReplay('hydration_race');
    const chain = buildHydrationForensicChain();
    expect(chain.steps.length).toBeGreaterThan(0);
    expect(chain.raceDetected).toBe(true);
  });

  it('rollback replay timeline includes rollback and drift signals', () => {
    const replay = runFailureReplay('adaptive_contradiction');
    const kinds = replay.timeline.events.map((e) => e.kind);
    expect(kinds).toContain('rollback_execution');
    expect(kinds).toContain('replay_divergence');
  });

  it('long-session windows 30/60/120 detect memory creep', () => {
    const now = Date.now();
    for (const window of [30, 60, 120] as const) {
      recordLongSessionSample({
        atMs: now - window * 60_000 + 1000,
        memoryPct: 20,
        queueDepth: 2,
        renderBurst: 0,
        eventLoopLagMs: 40,
        driftScore: 0.1,
      });
      recordLongSessionSample({
        atMs: now - 60_000,
        memoryPct: 55,
        queueDepth: 18,
        renderBurst: 12,
        eventLoopLagMs: 280,
        driftScore: 0.45,
      });
    }
    const r30 = analyzeLongSessionDegradation(30);
    const r120 = analyzeLongSessionDegradation(120);
    expect(r30.memoryCreepPct).toBeGreaterThan(0);
    expect(r120.queueGrowth).toBeGreaterThan(0);
  });

  it('event loop saturated tick captures snapshot', () => {
    observeRuntimeObservabilityTick(
      metrics({ eventLoopLatencyMs: 400, asyncQueueDepth: 30, asyncQueueLatencyMs: 500 }),
      performance(),
    );
    const snaps = getRuntimeSnapshots();
    expect(snaps.some((s) => s.trigger === 'event_loop_saturated' || s.trigger === 'starvation')).toBe(
      true,
    );
  });

  it('Redmi observability report meets forensic thresholds after replay', () => {
    runFailureReplay('cascade_storm');
    const bundle = buildRuntimeObservabilityBundle(metrics());
    const report = buildRedmiNote13ProObservabilityReport(bundle);
    expect(report.deviceModel).toContain('Redmi');
    expect(report.forensicReconstructionQuality).toBeGreaterThan(0.4);
    expect(report.replayDeterminismQuality).toBeGreaterThan(0.5);
    expect(report.memoryOverheadKb).toBeLessThan(600);
  });

  it('timeline rebuild is stable for identical replay input', () => {
    const a = runFailureReplay('thermal_degradation');
    resetRuntimeEventJournalForTest();
    resetRuntimeSnapshotsForTest();
    resetLongSessionSamplesForTest();
    const b = runFailureReplay('thermal_degradation');
    expect(a.timeline.rootCauseCandidates[0]?.kind).toBe(b.timeline.rootCauseCandidates[0]?.kind);
    const timeline = reconstructFailureTimeline();
    expect(timeline.cascadeSequence.length).toBeGreaterThan(0);
  });
});
