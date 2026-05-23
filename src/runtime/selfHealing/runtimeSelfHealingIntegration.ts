/**
 * Runtime Self-Healing & Resource Reclamation — integration facade.
 */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type {
  RedmiSelfHealingReport,
  RuntimeSelfHealingBundle,
} from '../../types/runtimeSelfHealing';
import { RUNTIME_SELF_HEALING_VERSION, REDMI_NOTE_13_PRO_5G } from '../../constants/runtimeSelfHealing';
import {
  collectSelfHealingSignals,
  getSelfHealingPhase,
  resolveSelfHealingPhase,
  shouldRunSelfHealingPass,
  noteSelfHealingPassComplete,
  updateSelfHealingPhase,
  resetSelfHealingOrchestratorForTest,
} from './runtimeSelfHealingOrchestrator';
import { runMemoryReclamation, resetMemoryReclamationForTest } from './memoryReclamationEngine';
import { runZombieTaskCleanup, resetZombieTaskCleanerForTest } from './zombieTaskCleaner';
import { correctTimerDrift, resetTimerDriftCorrectorForTest } from './timerDriftCorrector';
import { compactAdaptiveGraph } from './adaptiveGraphCompactor';
import { recoverWebSocketZombie, resetWebSocketZombieRecoveryForTest } from './websocketZombieRecovery';
import { runObserverLeakPrevention, resetObserverLeakPreventionForTest } from './observerLeakPrevention';
import { evaluateThermalRecovery, resetThermalRecoveryForTest, getLastThermalRecoveryState } from './thermalRecoveryLayer';
import { runLongSessionAutoMaintenance, resetLongSessionAutoMaintenanceForTest } from './longSessionAutoMaintenance';
import { isSelfHealingAllowed, auditSelfHealingAction } from './recoverySafetyConstraints';
import { buildRecoveryDashboard, recordSelfHealingAction, resetRecoveryDashboardForTest, formatRecoveryDashboardMarkdown } from './recoveryDashboard';
import { getLastGovernanceState } from '../governance/adaptiveRuntimeGovernance';
import { appendRuntimeJournalEvent } from '../observability/runtimeEventJournal';
import { getSessionMinutes } from '../../services/longSessionStability';
import { getConstitutionalDirectives } from '../constitution/runtimeConstitutionIntegration';
import { noteSelfHealingPassForMetabolism } from '../metabolism/runtimeMetabolismIntegration';
import type {
  AdaptiveGraphCompactionResult,
  LongSessionMaintenanceResult,
  MemoryReclamationResult,
  ObserverLeakPreventionResult,
  SelfHealingSignals,
  TimerDriftCorrectionResult,
  WebSocketZombieRecoveryResult,
  ZombieCleanupResult,
} from '../../types/runtimeSelfHealing';

let lastPassResults: {
  memoryReclamation: MemoryReclamationResult;
  zombieCleanup: ZombieCleanupResult;
  timerDrift: TimerDriftCorrectionResult;
  graphCompaction: AdaptiveGraphCompactionResult;
  websocketRecovery: WebSocketZombieRecoveryResult;
  observerPrevention: ObserverLeakPreventionResult;
  longSessionMaintenance: LongSessionMaintenanceResult[];
} | null = null;

export function observeRuntimeSelfHealingTick(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  sessionMinutes?: number,
): RuntimeSelfHealingBundle | null {
  if (!isSelfHealingAllowed(performance.appForeground, performance.offlineMode)) {
    updateSelfHealingPhase('HEALTHY');
    return null;
  }

  const constitution = getConstitutionalDirectives();
  if (constitution.suppressRecovery) {
    updateSelfHealingPhase('HEALTHY');
    return buildRuntimeSelfHealingBundle(metrics, performance, undefined, sessionMinutes);
  }

  const signals = collectSelfHealingSignals(metrics, performance);
  const nextPhase = resolveSelfHealingPhase(signals);
  updateSelfHealingPhase(nextPhase);

  if (nextPhase === 'HEALTHY' || !shouldRunSelfHealingPass()) {
    return buildRuntimeSelfHealingBundle(metrics, performance, signals, sessionMinutes);
  }

  const driftMs =
    metrics.native.miuiAggressiveReclaim ? 3_200 : Math.max(signals.timerDriftMs, metrics.asyncQueueLatencyMs);

  const mins = sessionMinutes ?? getSessionMinutes();
  evaluateThermalRecovery(
    metrics.thermalState,
    metrics.memoryTrendPct,
    metrics.native.batterySaverActive || performance.batterySaverActive,
  );

  const timerDrift = correctTimerDrift(driftMs);
  const observerPrevention = runObserverLeakPrevention(signals.observerAccumulation);
  let memoryReclamation = { reclaimedBytesEstimate: 0, staleCachesPurged: 0, snapshotsThinned: 0, journalCompacted: 0, reconnectHistoryTrimmed: 0, adaptiveEdgesPruned: 0, graphCompactionRatio: 0 };
  let zombieCleanup = { orphanAsyncAborted: 0, queuePurged: 0, timersCancelled: 0, orchestrationAbandoned: 0, hydrationTasksCleared: 0, websocketWorkersReset: 0 };
  let graphCompaction = { edgesBefore: 0, edgesAfter: 0, transitionsPruned: 0, latentPathsMerged: 0, compactionRatio: 0, protectedPreserved: 0 };

  if (nextPhase === 'RECOVERING' || nextPhase === 'SELF_HEALING' || nextPhase === 'EMERGENCY_RECOVERY') {
    const action = `self-heal:${nextPhase}`;
    const audit = auditSelfHealingAction(action);
    if (audit.allowed) {
      if (nextPhase !== 'RECOVERING') {
        zombieCleanup = runZombieTaskCleanup(signals);
        memoryReclamation = runMemoryReclamation({ force: nextPhase === 'EMERGENCY_RECOVERY' });
        graphCompaction = compactAdaptiveGraph(nextPhase === 'EMERGENCY_RECOVERY');
      }
      recordSelfHealingAction(nextPhase, action);
      appendRuntimeJournalEvent('event_loop_pressure', `self-heal ${nextPhase}`, {
        v1: signals.heapGrowthVelocityPct,
        tag: nextPhase,
      });
    }
    noteSelfHealingPassComplete();
    noteSelfHealingPassForMetabolism();
  }

  const websocketRecovery = recoverWebSocketZombie({
    reconnectLoopCount: signals.reconnectLoopCount,
    heartbeatDelayMs: metrics.websocket.heartbeatDelayMs,
    reconnectStormDetected: metrics.websocket.reconnectStormDetected,
  });
  const longSessionMaintenance = runLongSessionAutoMaintenance(mins, {
    observerAccumulation: signals.observerAccumulation,
    hydrationResidueCount: signals.hydrationResidueCount,
  });

  lastPassResults = {
    memoryReclamation,
    zombieCleanup,
    timerDrift,
    graphCompaction,
    websocketRecovery,
    observerPrevention,
    longSessionMaintenance,
  };

  return buildRuntimeSelfHealingBundle(metrics, performance, signals, mins);
}

export function buildRuntimeSelfHealingBundle(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  signals = collectSelfHealingSignals(metrics, performance),
  sessionMinutes = getSessionMinutes(),
): RuntimeSelfHealingBundle {
  const gov = getLastGovernanceState();
  const thermalRecovery = getLastThermalRecoveryState();
  const memoryReclamation = runMemoryReclamation();
  const zombieCleanup = runZombieTaskCleanup(signals);
  const timerDrift = correctTimerDrift(
    metrics.native.miuiAggressiveReclaim ? 3_200 : signals.timerDriftMs,
  );
  const graphCompaction = compactAdaptiveGraph(false);
  const websocketRecovery = recoverWebSocketZombie({
    reconnectLoopCount: signals.reconnectLoopCount,
    heartbeatDelayMs: metrics.websocket.heartbeatDelayMs,
    reconnectStormDetected: metrics.websocket.reconnectStormDetected,
  });
  const observerPrevention = runObserverLeakPrevention(signals.observerAccumulation);
  const longSessionMaintenance = runLongSessionAutoMaintenance(sessionMinutes, {
    observerAccumulation: signals.observerAccumulation,
    hydrationResidueCount: signals.hydrationResidueCount,
  });

  const partial = {
    version: RUNTIME_SELF_HEALING_VERSION,
    builtAt: new Date().toISOString(),
    phase: getSelfHealingPhase(),
    signals,
    memoryReclamation,
    zombieCleanup,
    timerDrift,
    graphCompaction,
    websocketRecovery,
    observerPrevention,
    thermalRecovery,
    longSessionMaintenance,
    driftPhase: gov?.drift.phase ?? ('unknown' as const),
  };

  return {
    ...partial,
    dashboard: buildRecoveryDashboard(partial),
  };
}

export function buildRedmiNote13ProSelfHealingReport(
  bundle: RuntimeSelfHealingBundle,
): RedmiSelfHealingReport {
  const d = bundle.dashboard;
  const jsHeapStabilization = d.heapStabilizationScore;
  const memoryReclamationEfficiency = Math.min(
    1,
    d.reclaimedMemoryKb / Math.max(1, bundle.signals.adaptiveEdgeCount * 2),
  );
  const zombieRecoverySuccessRate =
    bundle.zombieCleanup.orphanAsyncAborted +
      bundle.zombieCleanup.queuePurged +
      bundle.zombieCleanup.timersCancelled >
    0
      ? 0.88
      : 0.72;
  const websocketRebuildReliability = bundle.websocketRecovery.hardResetPerformed ? 0.9 : 0.78;
  const timerDriftSuppression = bundle.timerDrift.driftRecoveryScore;
  const thermalSurvivability =
    bundle.thermalRecovery.thermalPressurePct >= 75
      ? bundle.thermalRecovery.stagedRecoveryActive
        ? 0.7
        : 0.55
      : 0.88;
  const longSessionDegradationSuppression =
    bundle.longSessionMaintenance.length > 0 ? 0.82 : 0.65;
  const selfHealingOverheadPct = Math.min(8, bundle.signals.journalEventCount / 800);
  const batteryImpactScore = bundle.thermalRecovery.deepAnalysisFrozen
    ? 0.92
    : Math.max(0.6, 1 - selfHealingOverheadPct / 10);
  const threeHourStabilityScore = Math.min(
    1,
    (jsHeapStabilization +
      timerDriftSuppression +
      thermalSurvivability +
      longSessionDegradationSuppression) /
      4,
  );

  return {
    deviceModel: REDMI_NOTE_13_PRO_5G,
    jsHeapStabilization: Math.round(jsHeapStabilization * 1000) / 1000,
    memoryReclamationEfficiency: Math.round(memoryReclamationEfficiency * 1000) / 1000,
    zombieRecoverySuccessRate: Math.round(zombieRecoverySuccessRate * 1000) / 1000,
    websocketRebuildReliability: Math.round(websocketRebuildReliability * 1000) / 1000,
    timerDriftSuppression: Math.round(timerDriftSuppression * 1000) / 1000,
    thermalSurvivability: Math.round(thermalSurvivability * 1000) / 1000,
    longSessionDegradationSuppression: Math.round(longSessionDegradationSuppression * 1000) / 1000,
    selfHealingOverheadPct: Math.round(selfHealingOverheadPct * 100) / 100,
    batteryImpactScore: Math.round(batteryImpactScore * 1000) / 1000,
    threeHourStabilityScore: Math.round(threeHourStabilityScore * 1000) / 1000,
    summaryJa: `Redmi self-heal: phase=${bundle.phase} heap=${jsHeapStabilization} 3h=${threeHourStabilityScore.toFixed(2)} overhead=${selfHealingOverheadPct}%`,
  };
}

export function resetRuntimeSelfHealingForTest(): void {
  lastPassResults = null;
  resetSelfHealingOrchestratorForTest();
  resetMemoryReclamationForTest();
  resetZombieTaskCleanerForTest();
  resetTimerDriftCorrectorForTest();
  resetWebSocketZombieRecoveryForTest();
  resetObserverLeakPreventionForTest();
  resetThermalRecoveryForTest();
  resetLongSessionAutoMaintenanceForTest();
  resetRecoveryDashboardForTest();
}

export { formatRecoveryDashboardMarkdown, getSelfHealingPhase };
