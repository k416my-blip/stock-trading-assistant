/**
 * Unified Runtime Orchestrator — single deterministic tick coordinator.
 * Fixed order: Observability → Self-Healing → Evolution → Constitution → Metabolism → Curiosity → Longevity → Orchestration → UX
 */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';
import type {
  UnifiedRuntimeOrchestratorBundle,
  UnifiedRuntimeTickPhase,
} from '../../types/runtimeUnifiedOrchestrator';
import { RUNTIME_UNIFIED_ORCHESTRATOR_VERSION, UNIFIED_TICK_MIN_INTERVAL_MS } from '../../constants/runtimeUnifiedOrchestrator';
import { observeAsyncQueue } from '../stability/RuntimeAsyncQueueTracker';
import { noteRuntimeHeartbeat } from '../stability/RuntimeHeartbeatTracker';
import { observeMemoryPressureSignal } from '../stability/RuntimeMemoryPressureTracker';
import { recordMemoryPressureSample } from '../orchestrator/memoryPressureGuardian';
import { noteRuntimeReconnect } from '../stability/RuntimeReconnectTracker';
import { observeThermalLevel } from '../stability/RuntimeThermalTracker';
import { noteAppBackground, noteAppForeground } from '../stability/miuiBatteryDiagnostics';
import {
  evaluateRuntimeStabilitySnapshot,
  setLastRuntimeStabilitySnapshot,
} from '../stability/RuntimeHealthMonitor';
import { observeResumeCoordinatorTick } from '../coordinator/resumeCoordinatorIntegration';
import { observeNativeBoundaryTick } from '../../native/runtime/nativeBoundaryValidation';
import { getHydrationLockState } from '../stability/hydrationLock';
import { observeRuntimeObservabilityTick } from '../observability/runtimeObservabilityIntegration';
import { observeRuntimeSelfHealingTick } from '../selfHealing/runtimeSelfHealingIntegration';
import { observeRuntimeEvolutionTick } from '../evolution/runtimeEvolutionIntegration';
import { arbitrateRuntimeConstitution } from '../constitution/runtimeConstitutionIntegration';
import { tickRuntimeMetabolism } from '../metabolism/runtimeMetabolismIntegration';
import { tickRuntimeCuriosity } from '../curiosity/runtimeCuriosityIntegration';
import { tickRuntimeLongevity } from '../longevity/runtimeLongevityIntegration';
import { syncRuntimeClock, getRuntimeDeterministicSeed, resetRuntimeClockAuthorityForTest } from './runtimeClockAuthority';
import { isValidPhaseSequence } from './deterministicTickScheduler';
import { allocateTickBudget, computeLayerBudgetUsage } from './tickBudgetEngine';
import { sumLayerBudget } from './layerResourceAllocator';
import { shouldSkipLowerPriorityLayer } from './layerPriorityArbitration';
import { tryAcquireRecovery, releaseRecovery } from './recoveryConflictResolver';
import { beginAsyncBurstTick, shouldSuppressAsyncBurst } from './asyncBurstSuppressor';
import { detectZombieOrchestration } from './zombieOrchestrationDetector';
import { tryAcquireGovernanceLock, isGovernanceLockActive } from './governanceLockManager';
import { enqueueDeterministicReplay, completeDeterministicReplay, getReplayQueueLength } from './deterministicReplaySequencer';
import { beginTickSnapshot, endTickSnapshot, getSnapshotLatencyMs, resetTickSnapshotCoordinatorForTest } from './tickSnapshotCoordinator';
import { computeRuntimePressure } from './runtimePressureRouter';
import { getLayerBudget } from './layerResourceAllocator';
import { preConstitutionGate, postConstitutionGate } from './constitutionalTickGate';
import { shouldRunCuriosityPhase } from './curiosityIsolationGuard';
import { routeMetabolismBudget } from './metabolismBudgetRouter';
import {
  canRunUnifiedTick,
  resetUnifiedCooldownManagerForTest,
  setUnifiedCooldown,
} from './unifiedCooldownManager';
import { setThermalAuthority, getThermalAuthority, resetThermalAuthorityForTest } from './thermalAuthorityLayer';
import { resolveBatteryGovernance } from './batteryGovernanceLayer';
import { isBackgroundMinimalTick } from './backgroundExecutionController';
import { noteLayerWait, clearLayerWaits, detectDeadlockRisk, resetRuntimeDeadlockDetectorForTest } from './runtimeDeadlockDetector';
import { measureTickDrift, shouldDeferTickForDrift } from './tickDriftEliminator';
import { buildUnifiedTickGate } from './layerFreezeController';
import { auditUnifiedAction, evaluateSafetyEnvelope } from './runtimeSafetyEnvelope';
import { detectCascadeRisk, shouldBreakCascade } from './catastrophicCascadeBreaker';
import { activateEmergencyBrake, releaseEmergencyBrakeIfSafe, isEmergencyBrakeActive } from './runtimeEmergencyBrake';
import { transitionOrchestratorState, getCurrentOrchestratorState, resetDeterministicStateMachineForTest } from './deterministicStateMachine';
import { enterSafeMode, exitSafeModeIfAllowed, isSafeModeActive, getSafeModePolicy } from './safeModeRuntime';
import { buildUnifiedOrchestratorDashboard } from './unifiedOrchestratorDashboard';
import {
  beginLayersTick,
  endLayersTick,
  getLastLayersStabilitySnapshot,
  getLastUnifiedBundle,
  getLastUnifiedTickAtMs,
  isLayersTickReentrant,
  noteUnifiedTickComplete,
  resetUnifiedOrchestratorStorageForTest,
  setLastLayersStabilitySnapshot,
  getLastPhasesCompleted,
  setLastPhasesCompleted,
  setLastUnifiedBundle,
  setLastUnifiedTickAtMsForTest,
} from './unifiedOrchestratorStorage';
import { resetReplayRaceGuardForTest } from './replayRaceGuard';
import { resetDeterministicReplaySequencerForTest } from './deterministicReplaySequencer';
import { resetRecoveryConflictResolverForTest } from './recoveryConflictResolver';
import { resetAsyncBurstSuppressorForTest } from './asyncBurstSuppressor';
import { resetRuntimeLongevityForTest } from '../longevity/runtimeLongevityIntegration';

let uxDashboardAllowed = true;
let lastUxPhaseAt = 0;

export function resetRuntimeUnifiedOrchestratorForTest(): void {
  resetUnifiedOrchestratorStorageForTest();
  resetRuntimeClockAuthorityForTest();
  resetUnifiedCooldownManagerForTest();
  resetThermalAuthorityForTest();
  resetReplayRaceGuardForTest();
  resetDeterministicReplaySequencerForTest();
  resetRecoveryConflictResolverForTest();
  resetAsyncBurstSuppressorForTest();
  resetRuntimeDeadlockDetectorForTest();
  resetTickSnapshotCoordinatorForTest();
  resetDeterministicStateMachineForTest();
  resetRuntimeLongevityForTest();
  uxDashboardAllowed = true;
  lastUxPhaseAt = 0;
}

export { setLastUnifiedTickAtMsForTest };

export function getLastUnifiedOrchestratorBundle(): UnifiedRuntimeOrchestratorBundle | null {
  return getLastUnifiedBundle();
}

export function isUnifiedOrchestratorTickActive(): boolean {
  return isLayersTickReentrant();
}

export function shouldAllowUnifiedDashboardUpdate(): boolean {
  return uxDashboardAllowed;
}

function runPreLayerSignals(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RuntimeStabilitySnapshot {
  setThermalAuthority(metrics.thermalState);
  observeThermalLevel(metrics.thermalState);
  observeMemoryPressureSignal(metrics.memoryTrendPct, metrics.native.memoryWarning);
  recordMemoryPressureSample(metrics);
  if (!shouldSuppressAsyncBurst(metrics)) {
    observeAsyncQueue(metrics.asyncQueueDepth, metrics.asyncQueueLatencyMs);
  }
  if (metrics.websocket.reconnectAttempts > 0) {
    noteRuntimeReconnect(`ws-${metrics.websocket.reconnectAttempts}`);
  }
  if (metrics.websocket.heartbeatDelayMs > 0) {
    noteRuntimeHeartbeat(Date.now() - metrics.websocket.heartbeatDelayMs);
  }
  if (!performance.appForeground) noteAppBackground();
  else noteAppForeground();

  const snapshot = evaluateRuntimeStabilitySnapshot(metrics, performance);
  setLastRuntimeStabilitySnapshot(snapshot);
  observeResumeCoordinatorTick(metrics, performance, snapshot);

  const hydration = getHydrationLockState();
  observeNativeBoundaryTick({
    eventLoopLagMs: metrics.eventLoopLatencyMs,
    memoryPressurePct: metrics.memoryTrendPct,
    thermalLevel: getThermalAuthority(),
    asyncQueueDepth: metrics.asyncQueueDepth,
    asyncQueueLagMs: metrics.asyncQueueLatencyMs,
    hydrationOverlap: hydration.overlapCount,
    telemetryBurst: snapshot.anomalies.some(
      (a) => a.kind === 'heartbeat_gap' || a.kind === 'miui_battery_kill',
    ),
  });
  return snapshot;
}

function runPhase(
  phase: UnifiedRuntimeTickPhase,
  fn: () => void,
  completed: UnifiedRuntimeTickPhase[],
  skipped: string[],
  emergencyBrake: boolean,
): void {
  if (shouldSkipLowerPriorityLayer(phase, emergencyBrake)) {
    skipped.push(phase);
    return;
  }
  noteLayerWait(phase);
  if (!tryAcquireRecovery(phase)) {
    skipped.push(`${phase}:recovery_conflict`);
    return;
  }
  try {
    fn();
    completed.push(phase);
  } finally {
    releaseRecovery(phase, true);
  }
}

/** Layers 1–6 — only entry for runtime layer ticks. */
export function runUnifiedRuntimeLayersTick(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): { stabilitySnapshot: RuntimeStabilitySnapshot; bundle: UnifiedRuntimeOrchestratorBundle | null } {
  if (!beginLayersTick()) {
    const cached = getLastLayersStabilitySnapshot();
    if (cached) return { stabilitySnapshot: cached, bundle: getLastUnifiedBundle() };
  }

  const snapStart = beginTickSnapshot();
  const now = syncRuntimeClock().nowMs;

  if (shouldDeferTickForDrift(now) || !canRunUnifiedTick(now)) {
    endLayersTick();
    const cached = getLastLayersStabilitySnapshot();
    if (cached) return { stabilitySnapshot: cached, bundle: getLastUnifiedBundle() };
  }

  if (now - getLastUnifiedTickAtMs() < UNIFIED_TICK_MIN_INTERVAL_MS && getLastUnifiedTickAtMs() > 0) {
    endLayersTick();
    const cached = getLastLayersStabilitySnapshot();
    if (cached) return { stabilitySnapshot: cached, bundle: getLastUnifiedBundle() };
  }

  detectZombieOrchestration(now);
  beginAsyncBurstTick();

  const battery = resolveBatteryGovernance(metrics, performance);
  const pressure = computeRuntimePressure(metrics, performance);
  const envelope = evaluateSafetyEnvelope(metrics);
  const stabilitySnapshot = runPreLayerSignals(metrics, performance);
  const cascadeRisk = detectCascadeRisk(stabilitySnapshot);

  if (shouldBreakCascade(cascadeRisk)) activateEmergencyBrake('cascade breaker');
  if (envelope.recoveryEmergency) activateEmergencyBrake('recovery streak');
  if (envelope.cpuDegraded && envelope.heapPriority) enterSafeMode('cpu+heap envelope');

  const emergencyBrake = isEmergencyBrakeActive();
  const budget = allocateTickBudget(metrics, battery.survivalOnly);
  const completed: UnifiedRuntimeTickPhase[] = [];
  const skipped: string[] = [];
  let budgetSpent = 0;

  if (!auditUnifiedAction('unified_tick')) {
    endLayersTick();
    return { stabilitySnapshot, bundle: null };
  }

  runPhase(
    'observability',
    () => {
      observeRuntimeObservabilityTick(metrics, performance, {
        orchestrationState: stabilitySnapshot.healthLabelJa,
      });
      budgetSpent += getLayerBudget(budget, 'observability');
    },
    completed,
    skipped,
    emergencyBrake,
  );

  runPhase(
    'self_healing',
    () => {
      observeRuntimeSelfHealingTick(metrics, performance);
      budgetSpent += getLayerBudget(budget, 'self_healing');
    },
    completed,
    skipped,
    emergencyBrake,
  );

  const evolutionFull = !isBackgroundMinimalTick(performance) && !battery.survivalOnly;
  runPhase(
    'evolution',
    () => {
      if (evolutionFull) observeRuntimeEvolutionTick(metrics, performance);
      budgetSpent += getLayerBudget(budget, 'evolution');
    },
    completed,
    skipped,
    emergencyBrake,
  );

  preConstitutionGate();
  const govLock = tryAcquireGovernanceLock(now);
  runPhase(
    'constitution',
    () => {
      if (govLock) arbitrateRuntimeConstitution(metrics, performance);
      budgetSpent += getLayerBudget(budget, 'constitution');
    },
    completed,
    skipped,
    emergencyBrake,
  );

  const postConst = postConstitutionGate();
  const gate = buildUnifiedTickGate(metrics, performance, battery.survivalOnly, emergencyBrake, postConst);
  routeMetabolismBudget(gate);

  runPhase(
    'metabolism',
    () => {
      if (!isBackgroundMinimalTick(performance)) {
        tickRuntimeMetabolism(metrics, performance);
      }
      budgetSpent += getLayerBudget(budget, 'metabolism');
    },
    completed,
    skipped,
    emergencyBrake,
  );

  if (shouldRunCuriosityPhase(gate.allowCuriosity, getLayerBudget(budget, 'curiosity'))) {
    const replaySlot = gate.allowReplay ? enqueueDeterministicReplay(now) : { allowed: false, seed: 0, queueLen: 0 };
    runPhase(
      'curiosity',
      () => {
        if (!isBackgroundMinimalTick(performance)) tickRuntimeCuriosity(metrics, performance);
        if (replaySlot.allowed) completeDeterministicReplay();
        budgetSpent += getLayerBudget(budget, 'curiosity');
      },
      completed,
      skipped,
      emergencyBrake,
    );
  } else {
    skipped.push('curiosity');
  }

  if (!isBackgroundMinimalTick(performance)) {
    runPhase(
      'longevity',
      () => {
        tickRuntimeLongevity(metrics, performance);
        budgetSpent += getLayerBudget(budget, 'longevity');
      },
      completed,
      skipped,
      emergencyBrake,
    );
  } else {
    skipped.push('longevity');
  }

  const { tickSeq, driftMs } = noteUnifiedTickComplete(now);
  setUnifiedCooldown('global_tick', UNIFIED_TICK_MIN_INTERVAL_MS, now);
  clearLayerWaits();

  const state = transitionOrchestratorState({
    pressure,
    cascadeRisk,
    emergencyBrake,
    safeMode: isSafeModeActive(),
    recovering: getCurrentOrchestratorState() === 'RECOVERING',
  });

  releaseEmergencyBrakeIfSafe(cascadeRisk, envelope.recoveryEmergency);
  exitSafeModeIfAllowed(pressure, emergencyBrake);

  const deterministicHealth = Math.round(
    (1 - pressure) * 50 + (1 - cascadeRisk) * 30 + (isValidPhaseSequence(completed) ? 20 : 0),
  );

  endTickSnapshot(snapStart);

  const bundle: UnifiedRuntimeOrchestratorBundle = {
    version: RUNTIME_UNIFIED_ORCHESTRATOR_VERSION,
    builtAt: new Date().toISOString(),
    tickSeq,
    deterministicSeed: getRuntimeDeterministicSeed(),
    dashboard: buildUnifiedOrchestratorDashboard({
      orchestratorState: state,
      currentTickPhase: completed.at(-1) ?? 'idle',
      runtimePressure: pressure,
      thermalAuthority: getThermalAuthority(),
      replayQueue: getReplayQueueLength(),
      asyncPressure: metrics.asyncQueueDepth,
      layerBudgetUsage: computeLayerBudgetUsage(budgetSpent, sumLayerBudget(budget)),
      deterministicHealth,
      cascadeRisk,
      safeMode: isSafeModeActive(),
      emergencyBrake,
      governanceLock: isGovernanceLockActive(now),
      snapshotLatency: getSnapshotLatencyMs(),
      tickDrift: driftMs,
      replayRaceRisk: gate.allowReplay ? 0 : 0.5,
      deadlockRisk: detectDeadlockRisk(),
    }),
    phasesCompleted: completed,
    layersSkipped: skipped,
  };

  setLastUnifiedBundle(bundle);
  setLastLayersStabilitySnapshot(stabilitySnapshot);
  setLastPhasesCompleted(completed);
  void getSafeModePolicy();

  endLayersTick();
  return { stabilitySnapshot, bundle };
}

/** Phase 7–8 — after kernel evaluation. */
export function runUnifiedOrchestrationUxPhases(input: {
  orchestrationRan: boolean;
  gateAllowDashboard: boolean;
}): void {
  const completed = getLastPhasesCompleted();
  if (input.orchestrationRan) completed.push('orchestration');
  if (input.gateAllowDashboard) {
    uxDashboardAllowed = true;
    lastUxPhaseAt = Date.now();
    completed.push('ux');
  } else {
    uxDashboardAllowed = false;
  }
  setLastPhasesCompleted(completed);
  const bundle = getLastUnifiedBundle();
  if (bundle) {
    bundle.phasesCompleted = [...completed];
    bundle.dashboard.currentTickPhase = completed.at(-1) ?? 'idle';
    setLastUnifiedBundle(bundle);
  }
}
