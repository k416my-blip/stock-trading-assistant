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
import { resetAdaptiveLearningStoreForTest, getAdaptiveLearningStore } from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import { resetAdaptiveGovernanceForTest } from '../../../src/runtime/governance/adaptiveRuntimeGovernance';
import { resetRuntimeEventJournalForTest } from '../../../src/runtime/observability/runtimeEventJournal';
import { resetRuntimeEvolutionForTest } from '../../../src/runtime/evolution/runtimeEvolutionIntegration';
import { resetRuntimeSelfHealingForTest } from '../../../src/runtime/selfHealing/runtimeSelfHealingIntegration';
import { resetSelfHealingOrchestratorForTest } from '../../../src/runtime/selfHealing/runtimeSelfHealingOrchestrator';
import { resetRuntimeEvolutionMonitorForTest, updateEvolutionHealthState } from '../../../src/runtime/evolution/runtimeEvolutionMonitor';
import {
  collectLayerPressures,
  resolveConstitutionalState,
  resetConstitutionCoordinatorForTest,
} from '../../../src/runtime/constitution/runtimeConstitutionCoordinator';
import { detectLayerConflicts } from '../../../src/runtime/constitution/layerConflictDetector';
import { balanceLayerPower } from '../../../src/runtime/constitution/layerPowerBalancer';
import { allocateConstitutionalBudget } from '../../../src/runtime/constitution/constitutionalBudgetEngine';
import { runAdaptiveDiplomacy } from '../../../src/runtime/constitution/adaptiveDiplomacyEngine';
import { predictSystemicCollapse } from '../../../src/runtime/constitution/systemicCollapsePredictor';
import {
  activateConstitutionalRecovery,
  resetConstitutionalRecoveryForTest,
  tickConstitutionalRecovery,
} from '../../../src/runtime/constitution/constitutionalRecoveryProtocol';
import { auditConstitutionalAction } from '../../../src/runtime/constitution/protectedConstitutionalRules';
import { runConstitutionalSimulationSuite } from '../../../src/runtime/constitution/longTermConstitutionalSimulation';
import {
  arbitrateRuntimeConstitution,
  buildRedmiNote13ProConstitutionReport,
  getConstitutionalDirectives,
  resetRuntimeConstitutionForTest,
} from '../../../src/runtime/constitution/runtimeConstitutionIntegration';
import { DOMINANCE_THRESHOLD } from '../../../src/constants/runtimeConstitution';

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

function polarizedPressures() {
  return {
    governance: 0.85,
    recovery: 0.88,
    entropy: 0.7,
    exploration: 0.65,
    async: 0.82,
    observability: 0.6,
    survival: 0.55,
  };
}

describe('runtimeConstitution', () => {
  beforeEach(() => {
    resetRuntimeConstitutionForTest();
    resetConstitutionCoordinatorForTest();
    resetConstitutionalRecoveryForTest();
    resetAdaptiveLearningStoreForTest();
    resetAdaptiveGovernanceForTest();
    resetRuntimeEventJournalForTest();
    resetRuntimeEvolutionForTest();
    resetRuntimeSelfHealingForTest();
    resetSelfHealingOrchestratorForTest();
    resetRuntimeEvolutionMonitorForTest();
  });

  it('blocks arbitration in background', () => {
    expect(arbitrateRuntimeConstitution(metrics(), performance(false))).toBeNull();
  });

  it('rejects forbidden constitutional actions', () => {
    expect(auditConstitutionalAction('governance_bypass escalation').allowed).toBe(false);
    expect(auditConstitutionalAction('budget_rebalance').allowed).toBe(true);
  });

  it('detects layer conflicts and dominance', () => {
    const pressures = polarizedPressures();
    const conflicts = detectLayerConflicts(pressures);
    expect(conflicts.conflicts.length).toBeGreaterThan(0);
    expect(conflicts.layerDominanceIndex).toBeGreaterThan(DOMINANCE_THRESHOLD);
    const balance = balanceLayerPower(pressures);
    expect(balance.suppressedLayers.length).toBeGreaterThan(0);
  });

  it('allocates budgets and diplomacy compromise', () => {
    const pressures = polarizedPressures();
    const conflicts = detectLayerConflicts(pressures);
    const balance = balanceLayerPower(pressures);
    const budget = allocateConstitutionalBudget(pressures, balance);
    expect(budget.cpuBudgetPct).toBeGreaterThan(0);
    const diplomacy = runAdaptiveDiplomacy(conflicts.conflicts, pressures);
    expect(diplomacy.compromiseJa.length).toBeGreaterThan(0);
  });

  it('predicts elevated collapse risk under polarization', () => {
    const pressures = polarizedPressures();
    const conflicts = detectLayerConflicts(pressures);
    const collapse = predictSystemicCollapse(pressures, conflicts);
    expect(['ELEVATED', 'SEVERE', 'COLLAPSING']).toContain(collapse.level);
  });

  it('constitutional recovery activates and rebalances after 45s', () => {
    const now = Date.now();
    const recovery = activateConstitutionalRecovery('CONSTITUTIONAL_CRISIS', 'recovery', now);
    expect(recovery.active).toBe(true);
    expect(recovery.replayFrozen).toBe(true);
    const rebalanced = tickConstitutionalRecovery(now + 46_000);
    expect(rebalanced).toBe(true);
  });

  it('resolves constitutional crisis under extreme stress', () => {
    updateEvolutionHealthState('COLLAPSING');
    const pressures = collectLayerPressures(
      metrics({ asyncQueueDepth: 35, asyncQueueLatencyMs: 600, memoryTrendPct: 90, thermalState: 'severe' }),
    );
    const conflicts = detectLayerConflicts(pressures);
    const state = resolveConstitutionalState(pressures, Math.max(conflicts.conflictSeverity, 0.8));
    expect(['UNSTABLE', 'CONSTITUTIONAL_CRISIS', 'POLARIZED']).toContain(state);
  });

  it('simulation suite covers 1/7/30/90 day horizons', () => {
    const reports = runConstitutionalSimulationSuite(polarizedPressures());
    expect(reports.map((r) => r.horizonDays)).toEqual([1, 7, 30, 90]);
    expect(reports[3].equilibriumRetention).toBeGreaterThan(0);
  });

  it('arbitration emits directives suppressing recovery dominance', () => {
    updateEvolutionHealthState('OVERFITTED');
    const stressed = metrics({ asyncQueueDepth: 28, asyncQueueLatencyMs: 450 });
    arbitrateRuntimeConstitution(stressed, performance());
    const bundle = arbitrateRuntimeConstitution(
      metrics({ asyncQueueDepth: 30, asyncQueueLatencyMs: 500, memoryTrendPct: 85 }),
      performance(),
    );
    expect(bundle).not.toBeNull();
    const directives = getConstitutionalDirectives();
    expect(directives.governanceThrottle).toBeLessThanOrEqual(1);
    const report = buildRedmiNote13ProConstitutionReport(bundle!);
    expect(report.deviceModel).toContain('Redmi');
    expect(report.ninetyDayCivilizationSurvivability).toBeGreaterThan(0.2);
  });

  it('store remains for adaptive layers after arbitration', () => {
    getAdaptiveLearningStore('redmi');
    arbitrateRuntimeConstitution(metrics(), performance());
    expect(getAdaptiveLearningStore().deviceProfile).toBe('redmi');
  });
});
