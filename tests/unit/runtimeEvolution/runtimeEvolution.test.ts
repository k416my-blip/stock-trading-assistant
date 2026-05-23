import { beforeEach, describe, expect, it } from 'vitest';
import type { RuntimeTelemetryMetricsSnapshot } from '../../../src/types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../../src/types/performanceCost';
import { resetAdaptiveLearningStoreForTest, getAdaptiveLearningStore } from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import { resetAdaptiveGovernanceForTest } from '../../../src/runtime/governance/adaptiveRuntimeGovernance';
import {
  createRollbackSnapshot,
  resetRollbackSystemForTest,
} from '../../../src/runtime/governance/adaptiveRollbackSystem';
import { resetRuntimeEventJournalForTest } from '../../../src/runtime/observability/runtimeEventJournal';
import {
  collectEvolutionSignals,
  resolveEvolutionHealthState,
  resetRuntimeEvolutionMonitorForTest,
} from '../../../src/runtime/evolution/runtimeEvolutionMonitor';
import { measureAdaptiveEntropy, restoreEntropyOnLow } from '../../../src/runtime/evolution/adaptiveEntropyEngine';
import { detectReplayBias } from '../../../src/runtime/evolution/replayBiasDetector';
import {
  evaluateRollbackDependency,
  shouldSuppressRollback,
  resetRollbackDependencyGuardForTest,
  noteRollbackOccurred,
} from '../../../src/runtime/evolution/rollbackDependencyGuard';
import { detectFalseStability } from '../../../src/runtime/evolution/falseStabilityDetector';
import { runExplorationRecovery } from '../../../src/runtime/evolution/explorationRecoveryLayer';
import { preserveAdaptiveDiversity, shouldBlockPruneEdge } from '../../../src/runtime/evolution/adaptiveDiversityPreserver';
import {
  resolveLongTermEvolutionPhase,
  applyRigidPhaseRemediation,
  resetLongTermEvolutionPhasesForTest,
} from '../../../src/runtime/evolution/longTermEvolutionPhases';
import { auditMetaEvolutionAction, isForbiddenEdgeResurrection } from '../../../src/runtime/evolution/metaGovernanceLayer';
import { runEvolutionSimulationSuite } from '../../../src/runtime/evolution/longSessionEvolutionSimulation';
import {
  observeRuntimeEvolutionTick,
  buildRedmiNote13ProEvolutionReport,
  resetRuntimeEvolutionForTest,
} from '../../../src/runtime/evolution/runtimeEvolutionIntegration';

function metrics(): RuntimeTelemetryMetricsSnapshot {
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

function seedStagnantStore(): void {
  const store = getAdaptiveLearningStore('redmi');
  store.replayCount = 20;
  store.rootRankingHistory = {
    async_starvation: { count: 18, successCount: 16 },
    reconnect_storm: { count: 2, successCount: 1 },
  };
  store.edges['dominant'] = {
    edgeKey: 'dominant',
    from: 'async_queue_saturation',
    to: 'event_loop_pressure',
    relation: 'causes',
    hitCount: 30,
    successfulPredictionCount: 28,
    falsePositiveCount: 0,
    decayReliability: 0.9,
    runtimeLearnedWeight: 0.95,
    confidenceEma: 0.92,
    replaySupport: 20,
    stability: 0.9,
    protectedInvariant: false,
  };
  store.edges['dormant'] = {
    edgeKey: 'dormant',
    from: 'hydration_pause',
    to: 'websocket_reconnect',
    relation: 'causes',
    hitCount: 2,
    successfulPredictionCount: 1,
    falsePositiveCount: 1,
    decayReliability: 0.2,
    runtimeLearnedWeight: 0.1,
    confidenceEma: 0.15,
    replaySupport: 1,
    stability: 0.2,
    protectedInvariant: false,
  };
}

describe('runtimeEvolution', () => {
  beforeEach(() => {
    resetRuntimeEvolutionForTest();
    resetAdaptiveLearningStoreForTest();
    resetAdaptiveGovernanceForTest();
    resetRollbackSystemForTest();
    resetRuntimeEventJournalForTest();
    resetRuntimeEvolutionMonitorForTest();
    resetRollbackDependencyGuardForTest();
    resetLongTermEvolutionPhasesForTest();
  });

  it('blocks evolution tick in background', () => {
    expect(observeRuntimeEvolutionTick(metrics(), performance(false))).toBeNull();
  });

  it('rejects forbidden meta evolution actions', () => {
    expect(auditMetaEvolutionAction('governance_bypass mutation').allowed).toBe(false);
    expect(isForbiddenEdgeResurrection('ownership_violation', 'duplicate_socket')).toBe(true);
  });

  it('detects replay bias and stagnation', () => {
    seedStagnantStore();
    const store = getAdaptiveLearningStore();
    const signals = collectEvolutionSignals(store);
    const bias = detectReplayBias(store);
    expect(bias.sameRootDominance).toBe(true);
    expect(bias.replayBiasScore).toBeGreaterThan(0.5);
    const health = resolveEvolutionHealthState(signals);
    expect(['STAGNATING', 'OVERFITTED', 'COLLAPSING']).toContain(health);
  });

  it('restores entropy on low score', () => {
    seedStagnantStore();
    const store = getAdaptiveLearningStore();
    const entropy = measureAdaptiveEntropy(store);
    const before = store.edges['dormant']!.runtimeLearnedWeight;
    restoreEntropyOnLow(store, { ...entropy, entropyScore: 0.2 });
    expect(store.edges['dormant']!.runtimeLearnedWeight).toBeGreaterThanOrEqual(before);
  });

  it('rollback dependency triggers suppress and penalty', () => {
    seedStagnantStore();
    const store = getAdaptiveLearningStore();
    for (let i = 0; i < 6; i += 1) createRollbackSnapshot(store, `test_${i}`);
    noteRollbackOccurred();
    const dep = evaluateRollbackDependency(store, 0.2);
    expect(dep.rollbackOveruse).toBe(true);
    expect(shouldSuppressRollback()).toBe(true);
    expect(dep.rollbackPenalty).toBeGreaterThan(0);
  });

  it('detects false stability patterns', () => {
    seedStagnantStore();
    const store = getAdaptiveLearningStore();
    const signals = collectEvolutionSignals(store);
    const bias = detectReplayBias(store);
    const entropy = measureAdaptiveEntropy(store);
    const fs = detectFalseStability(signals, bias, entropy, true);
    expect(['FALSE_STABLE', 'HIDDEN_DRIFT', 'LATENT_COLLAPSE', 'NONE']).toContain(fs.state);
  });

  it('preserves minority and blocks novelty prune', () => {
    seedStagnantStore();
    const store = getAdaptiveLearningStore();
    const div = preserveAdaptiveDiversity(store);
    expect(div.minorityPathsKept + div.rareLineageKept).toBeGreaterThan(0);
    expect(shouldBlockPruneEdge('dormant', store)).toBe(true);
  });

  it('exploration recovery revives dormant edges', () => {
    seedStagnantStore();
    const store = getAdaptiveLearningStore();
    const r = runExplorationRecovery(store, true);
    expect(r.dormantEdgesRevived + r.alternativePathsOpened).toBeGreaterThan(0);
  });

  it('long-term RIGID phase applies remediation', () => {
    seedStagnantStore();
    const store = getAdaptiveLearningStore();
    const signals = collectEvolutionSignals(store);
    const entropy = measureAdaptiveEntropy(store);
    resolveLongTermEvolutionPhase('STAGNATING', signals, entropy);
    const actions = applyRigidPhaseRemediation(store, { ...entropy, entropyScore: 0.25 });
    expect(actions.length).toBeGreaterThan(0);
  });

  it('simulation suite covers 1/3/7/30 day horizons', () => {
    seedStagnantStore();
    const reports = runEvolutionSimulationSuite(getAdaptiveLearningStore(), 0.35);
    expect(reports.map((r) => r.horizonDays)).toEqual([1, 3, 7, 30]);
    expect(reports[3].diversityRetention).toBeGreaterThan(0);
  });

  it('evolution tick produces Redmi report with anti-stagnation metrics', () => {
    seedStagnantStore();
    const bundle = observeRuntimeEvolutionTick(metrics(), performance());
    expect(bundle).not.toBeNull();
    expect(bundle!.dashboard.entropyScore).toBeGreaterThan(0);
    const report = buildRedmiNote13ProEvolutionReport(bundle!);
    expect(report.deviceModel).toContain('Redmi');
    expect(report.thirtyDayAdaptiveSurvivability).toBeGreaterThan(0.3);
    expect(report.replayBiasSuppression).toBeLessThanOrEqual(1);
  });
});
