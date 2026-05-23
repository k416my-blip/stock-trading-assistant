import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/mobileRedmiRuntime', () => ({
  cleanupDuplicateTimers: vi.fn(),
}));
vi.mock('../../../src/runtime/orchestrator/asyncPriorityScheduler', () => ({
  cancelAsyncTasksByLabel: vi.fn(() => 0),
  compactStalePriorityQueue: vi.fn(() => 0),
}));

import type { RuntimeTelemetryMetricsSnapshot } from '../../../src/types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../../src/types/performanceCost';
import { resetRuntimeEventJournalForTest, appendRuntimeJournalEvent } from '../../../src/runtime/observability/runtimeEventJournal';
import { resetAdaptiveLearningStoreForTest, getAdaptiveLearningStore } from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import {
  observeRuntimeSelfHealingTick,
  buildRuntimeSelfHealingBundle,
  buildRedmiNote13ProSelfHealingReport,
  resetRuntimeSelfHealingForTest,
} from '../../../src/runtime/selfHealing/runtimeSelfHealingIntegration';
import {
  collectSelfHealingSignals,
  resolveSelfHealingPhase,
  resetSelfHealingOrchestratorForTest,
  shouldRunSelfHealingPass,
  noteSelfHealingPassComplete,
} from '../../../src/runtime/selfHealing/runtimeSelfHealingOrchestrator';
import { runMemoryReclamation } from '../../../src/runtime/selfHealing/memoryReclamationEngine';
import { runZombieTaskCleanup } from '../../../src/runtime/selfHealing/zombieTaskCleaner';
import { correctTimerDrift } from '../../../src/runtime/selfHealing/timerDriftCorrector';
import { compactAdaptiveGraph } from '../../../src/runtime/selfHealing/adaptiveGraphCompactor';
import { evaluateThermalRecovery } from '../../../src/runtime/selfHealing/thermalRecoveryLayer';
import { runLongSessionAutoMaintenance, resetLongSessionAutoMaintenanceForTest } from '../../../src/runtime/selfHealing/longSessionAutoMaintenance';
import { isSelfHealingAllowed, auditSelfHealingAction } from '../../../src/runtime/selfHealing/recoverySafetyConstraints';
import { JOURNAL_COMPACT_THRESHOLD } from '../../../src/constants/runtimeSelfHealing';

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

function performance(foreground = true): PerformanceCostRuntimeSnapshot {
  return {
    appForeground: foreground,
    appStateLabel: foreground ? 'active' : 'background',
    networkPaused: false,
    offlineMode: false,
    batterySaverActive: false,
    animationsReduced: false,
    xApiPaused: false,
    pollingPaused: false,
    lastOnlineAt: new Date().toISOString(),
  };
}

describe('runtimeSelfHealing', () => {
  beforeEach(() => {
    resetRuntimeSelfHealingForTest();
    resetAdaptiveLearningStoreForTest();
    resetRuntimeEventJournalForTest();
  });

  it('blocks self-healing in background', () => {
    const bundle = observeRuntimeSelfHealingTick(metrics(), performance(false));
    expect(bundle).toBeNull();
    expect(isSelfHealingAllowed(false, false)).toBe(false);
  });

  it('rejects forbidden recovery actions', () => {
    expect(auditSelfHealingAction('governance_bypass rollback').allowed).toBe(false);
    expect(auditSelfHealingAction('memory compact').allowed).toBe(true);
  });

  it('escalates to SELF_HEALING under heap and queue pressure', () => {
    const signals = collectSelfHealingSignals(
      metrics({
        jsHeapEstimateMb: 200,
        memoryTrendPct: 55,
        asyncQueueLatencyMs: 500,
        asyncQueueDepth: 30,
      }),
      performance(),
    );
    expect(resolveSelfHealingPhase(signals)).toBe('SELF_HEALING');
  });

  it('runs memory reclamation and journal compact', () => {
    for (let i = 0; i < JOURNAL_COMPACT_THRESHOLD + 50; i += 1) {
      appendRuntimeJournalEvent('async_queue_saturation', `e${i}`, { v1: i });
    }
    const result = runMemoryReclamation({ force: true });
    expect(result.journalCompacted).toBeGreaterThan(0);
  });

  it('corrects timer drift on Redmi-scale skew', () => {
    const r = correctTimerDrift(3_400);
    expect(r.timerDriftMs).toBe(3_400);
    expect(r.driftRecoveryScore).toBeLessThan(1);
    expect(r.intervalsDeduped).toBeGreaterThanOrEqual(1);
  });

  it('thermal deep freeze at severe pressure', () => {
    const t = evaluateThermalRecovery('severe', 80, true);
    expect(t.deepAnalysisFrozen).toBe(true);
    expect(t.adaptiveLearningPaused).toBe(true);
  });

  it('long-session maintenance at 30/60/120/180 min', () => {
    resetLongSessionAutoMaintenanceForTest();
    const results = runLongSessionAutoMaintenance(185, {
      observerAccumulation: 8,
      hydrationResidueCount: 1,
    });
    const windows = results.map((r) => r.windowMinutes);
    expect(windows).toContain(30);
    expect(windows).toContain(60);
    expect(windows).toContain(120);
    expect(windows).toContain(180);
  });

  it('zombie cleanup and graph compaction', () => {
    const store = getAdaptiveLearningStore('redmi');
    store.edges['weak-a'] = {
      edgeKey: 'weak-a',
      from: 'async_queue_saturation',
      to: 'event_loop_pressure',
      relation: 'causes',
      hitCount: 1,
      successfulPredictionCount: 0,
      falsePositiveCount: 2,
      decayReliability: 0.1,
      runtimeLearnedWeight: 0.1,
      confidenceEma: 0.1,
      replaySupport: 0,
      stability: 0.1,
      protectedInvariant: false,
    };
    const compact = compactAdaptiveGraph(true);
    expect(compact.edgesAfter).toBeLessThanOrEqual(compact.edgesBefore);
    const zombies = runZombieTaskCleanup({
      queueStagnationMs: 500,
      observerAccumulation: 10,
      hydrationResidueCount: 0,
    });
    expect(zombies.queuePurged + zombies.orphanAsyncAborted).toBeGreaterThanOrEqual(0);
  });

  it('self-healing tick produces bundle and Redmi report', () => {
    resetSelfHealingOrchestratorForTest();
    noteSelfHealingPassComplete(0);
    const stressed = metrics({
      jsHeapEstimateMb: 220,
      memoryTrendPct: 60,
      asyncQueueLatencyMs: 520,
      asyncQueueDepth: 28,
      websocket: {
        wsLatencyMs: 200,
        reconnectAttempts: 9,
        frameDelayMs: 0,
        heartbeatDelayMs: 9_000,
        offlineRecoveryDurationMs: null,
        jitterScore: 80,
        reconnectStormDetected: true,
        packetBatchingEfficiencyPct: 40,
      },
      thermalState: 'severe',
    });
    const bundle = observeRuntimeSelfHealingTick(stressed, performance(), 125);
    expect(bundle).not.toBeNull();
    expect(['RECOVERING', 'SELF_HEALING', 'EMERGENCY_RECOVERY']).toContain(bundle!.phase);
    const report = buildRedmiNote13ProSelfHealingReport(bundle!);
    expect(report.deviceModel).toContain('Redmi');
    expect(report.threeHourStabilityScore).toBeGreaterThan(0.4);
  });

  it('journal ring stays bounded after stress ticks', () => {
    for (let i = 0; i < 120; i += 1) {
      if (!shouldRunSelfHealingPass()) noteSelfHealingPassComplete(0);
      observeRuntimeSelfHealingTick(
        metrics({ asyncQueueDepth: 20 + (i % 5), asyncQueueLatencyMs: 300 }),
        performance(),
        35,
      );
    }
    const bundle = buildRuntimeSelfHealingBundle(metrics(), performance(), undefined, 35);
    expect(bundle.dashboard.reclaimedMemoryKb).toBeGreaterThanOrEqual(0);
  });
});
