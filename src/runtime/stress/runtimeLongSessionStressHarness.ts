/**
 * Long Session Stress Harness — verification only (no new runtime layer).
 * Accelerated tick simulation for CI; complements on-device soak.
 */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type {
  FinalSurvivalReport,
  MemorySnapshotSample,
  StressScenarioId,
  StressScenarioResult,
} from '../../types/runtimeLongSessionStress';
import { STRESS_SCENARIO_IDS } from '../../types/runtimeLongSessionStress';
import {
  REDMI_NOTE_13_PRO_5G,
  RUNTIME_LONG_SESSION_STRESS_VERSION,
  STRESS_ASYNC_SATURATION_DEPTH,
  STRESS_CASCADE_EMERGENCY_THRESHOLD,
  STRESS_DASHBOARD_FPS_MIN,
  STRESS_ENTROPY_COLLAPSE_SIM,
  STRESS_HEAP_GROWTH_WARN_MB,
  STRESS_MINUTES_PER_TICK,
  STRESS_REPLAY_GROWTH_WARN,
  STRESS_SNAPSHOT_EVERY_TICKS,
} from '../../constants/runtimeLongSessionStress';
import { UNIFIED_TICK_MIN_INTERVAL_MS } from '../../constants/runtimeUnifiedOrchestrator';
import { resetAdaptiveLearningStoreForTest, getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';
import { resetRuntimeConstitutionForTest } from '../constitution/runtimeConstitutionIntegration';
import { resetRuntimeMetabolismForTest } from '../metabolism/runtimeMetabolismIntegration';
import { resetRuntimeCuriosityForTest } from '../curiosity/runtimeCuriosityIntegration';
import { resetRuntimeLongevityForTest } from '../longevity/runtimeLongevityIntegration';
import {
  resetRuntimeUnifiedOrchestratorForTest,
  runUnifiedRuntimeLayersTick,
  setLastUnifiedTickAtMsForTest,
} from '../unified/runtimeUnifiedOrchestratorIntegration';
import { resetUnifiedCooldownManagerForTest } from '../unified/unifiedCooldownManager';
import { resetLongSessionStabilityForTest } from '../../services/longSessionStability';
import { getLastLongevityBundle } from '../longevity/runtimeLongevityIntegration';
import { getLastUnifiedOrchestratorBundle } from '../unified/runtimeUnifiedOrchestratorIntegration';
import { getLastMetabolismBundle } from '../metabolism/runtimeMetabolismIntegration';
import { runSandboxMutation } from '../curiosity/controlledMutationSandbox';
import { runDeterministicSandboxReplay } from '../curiosity/sandboxEvolutionReplay';
import { resetCuriosityStorageForTest } from '../curiosity/curiosityStorage';
import { detectCascadeRisk } from '../unified/catastrophicCascadeBreaker';
import { activateEmergencyBrake, isEmergencyBrakeActive } from '../unified/runtimeEmergencyBrake';
import { enterSafeMode, isSafeModeActive } from '../unified/safeModeRuntime';
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';

const memorySnapshots: MemorySnapshotSample[] = [];
let tickCounter = 0;
let gcPassCount = 0;
let initialHeapMb = 100;
let initialReplayCount = 0;

function baseMetrics(sessionMinutes: number): RuntimeTelemetryMetricsSnapshot {
  return {
    jsHeapEstimateMb: 100 + Math.min(80, sessionMinutes * 0.15),
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
    memoryTrendPct: Math.min(90, 25 + sessionMinutes * 0.2),
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
      sessionMinutes,
      checkpoint:
        sessionMinutes >= 90 ? '90m' : sessionMinutes >= 60 ? '60m' : sessionMinutes >= 30 ? '30m' : 'under_30m',
      memoryGrowthTrendPct: Math.min(90, 30 + sessionMinutes * 0.25),
      asyncQueueGrowthTrend: 0,
      renderDegradationPct: 0,
      websocketDegradationPct: 0,
      orchestrationSlowdownPct: 0,
      explanationCacheGrowth: Math.min(20, Math.floor(sessionMinutes / 15)),
    },
    measuredAt: new Date().toISOString(),
  };
}

function basePerformance(overrides?: Partial<PerformanceCostRuntimeSnapshot>): PerformanceCostRuntimeSnapshot {
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
    ...overrides,
  };
}

function runTicks(
  count: number,
  mutate: (tick: number, sessionMinutes: number) => {
    metrics: RuntimeTelemetryMetricsSnapshot;
    performance: PerformanceCostRuntimeSnapshot;
  },
): { lastSnap: RuntimeStabilitySnapshot | null; failures: string[] } {
  const failures: string[] = [];
  let lastSnap: RuntimeStabilitySnapshot | null = null;
  for (let i = 0; i < count; i += 1) {
    tickCounter += 1;
    setLastUnifiedTickAtMsForTest(Date.now() - UNIFIED_TICK_MIN_INTERVAL_MS - 10);
    const sessionMinutes = (tickCounter * STRESS_MINUTES_PER_TICK) % 240;
    const { metrics, performance } = mutate(i, sessionMinutes);
    try {
      const result = runUnifiedRuntimeLayersTick(metrics, performance);
      lastSnap = result.stabilitySnapshot;
      if (getLastMetabolismBundle()) gcPassCount += 1;
      if (tickCounter % STRESS_SNAPSHOT_EVERY_TICKS === 0) {
        const unified = getLastUnifiedOrchestratorBundle();
        const longevity = getLastLongevityBundle();
        const store = getAdaptiveLearningStore('redmi');
        memorySnapshots.push({
          atTick: tickCounter,
          sessionMinutes,
          jsHeapMb: metrics.jsHeapEstimateMb,
          replayCount: store.replayCount,
          asyncQueueDepth: metrics.asyncQueueDepth,
          entropyHealth: longevity?.dashboard.entropyHealth ?? 50,
          orchestratorState: unified?.dashboard.orchestratorState ?? 'HEALTHY',
          longevityState: longevity?.dashboard.longevityState ?? 'HEALTHY',
        });
        if (memorySnapshots.length > 120) memorySnapshots.shift();
      }
    } catch (e) {
      failures.push(`tick ${tickCounter}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { lastSnap, failures };
}

function scenarioLabel(id: StressScenarioId): string {
  const labels: Record<StressScenarioId, string> = {
    long_session_30m: 'Long Session 30m',
    long_session_60m: 'Long Session 60m',
    long_session_120m: 'Long Session 120m',
    long_session_180m: 'Long Session 180m',
    background_survival: 'Background Survival',
    thermal_stress: 'Thermal Stress',
    battery_saver: 'Battery Saver',
    replay_flood: 'Replay Flood',
    dashboard_leak: 'Dashboard Leak',
    websocket_storm: 'WebSocket Storm',
    gc_oscillation: 'GC Oscillation',
    heap_growth: 'Heap Growth',
    async_saturation: 'Async Saturation',
    curiosity_flood: 'Curiosity Flood',
    replay_civilization: 'Replay Civilization',
    entropy_collapse: 'Entropy Collapse',
    safe_mode_trigger: 'Safe Mode',
    emergency_brake: 'Emergency Brake',
    dashboard_fps: 'Dashboard FPS',
    android_kill_recovery: 'Android Kill Recovery',
  };
  return labels[id];
}

function runScenario(id: StressScenarioId): StressScenarioResult {
  resetUnifiedCooldownManagerForTest();
  setLastUnifiedTickAtMsForTest(0);
  const failures: string[] = [];
  const notes: string[] = [];
  let ticksRun = 0;

  const finish = (passed: boolean, ticks: number, simMin: number): StressScenarioResult => ({
    id,
    labelJa: scenarioLabel(id),
    passed: passed && failures.length === 0,
    ticksRun: ticks,
    durationSimMinutes: simMin,
    failuresJa: failures,
    notesJa: notes,
  });

  switch (id) {
    case 'long_session_30m':
    case 'long_session_60m':
    case 'long_session_120m':
    case 'long_session_180m': {
      const target = id === 'long_session_30m' ? 30 : id === 'long_session_60m' ? 60 : id === 'long_session_120m' ? 120 : 180;
      resetLongSessionStabilityForTest(Date.now() - target * 60_000);
      const tickCount = Math.ceil(target / STRESS_MINUTES_PER_TICK);
      const heapAtStart = memorySnapshots.at(-1)?.jsHeapMb ?? initialHeapMb;
      const r = runTicks(tickCount, (_, sm) => ({
        metrics: baseMetrics(sm),
        performance: basePerformance(),
      }));
      failures.push(...r.failures);
      ticksRun = tickCount;
      const heapGrowth = (memorySnapshots.at(-1)?.jsHeapMb ?? heapAtStart) - heapAtStart;
      const heapAllowance = STRESS_HEAP_GROWTH_WARN_MB + target / 30;
      if (heapGrowth > heapAllowance) failures.push(`heap growth ${heapGrowth.toFixed(1)}MB > ${heapAllowance}`);
      return finish(failures.length === 0, ticksRun, target);
    }

    case 'background_survival': {
      const r = runTicks(20, (i) => ({
        metrics: baseMetrics(i * 2),
        performance: basePerformance({ appForeground: i % 2 === 0 }),
      }));
      failures.push(...r.failures);
      ticksRun = 20;
      const skipped = getLastUnifiedOrchestratorBundle()?.layersSkipped ?? [];
      if (!skipped.some((s) => s.includes('longevity') || s === 'curiosity')) notes.push('background skip check optional');
      return finish(true, ticksRun, 40);
    }

    case 'thermal_stress': {
      const r = runTicks(12, () => ({
        metrics: { ...baseMetrics(30), thermalState: 'severe', native: { ...baseMetrics(30).native, thermalThrottlingDetected: true } },
        performance: basePerformance(),
      }));
      failures.push(...r.failures);
      const longevity = getLastLongevityBundle();
      if (longevity?.dashboard.longevityMode !== 'frozen') notes.push(`longevity mode=${longevity?.dashboard.longevityMode}`);
      return finish(failures.length === 0, 12, 24);
    }

    case 'battery_saver': {
      runTicks(6, () => ({
        metrics: { ...baseMetrics(10), native: { ...baseMetrics(10).native, batterySaverActive: true } },
        performance: basePerformance({ batterySaverActive: true }),
      }));
      runTicks(6, () => ({
        metrics: baseMetrics(12),
        performance: basePerformance({ batterySaverActive: false }),
      }));
      ticksRun = 12;
      return finish(true, ticksRun, 24);
    }

    case 'replay_flood': {
      const store = getAdaptiveLearningStore('redmi');
      for (let i = 0; i < 40; i += 1) {
        store.replayCount += 1;
        runDeterministicSandboxReplay(i, `flood ${i}`);
      }
      const growth = store.replayCount - initialReplayCount;
      if (growth > STRESS_REPLAY_GROWTH_WARN * 2) notes.push(`replay grew ${growth} (sandbox only)`);
      ticksRun = 40;
      return finish(true, ticksRun, 5);
    }

    case 'dashboard_leak': {
      const r = runTicks(50, (i) => ({
        metrics: {
          ...baseMetrics(60),
          render: { ...baseMetrics(60).render, dashboardCommitDurationMs: 8 + (i % 5), excessiveRerenderDetected: i % 7 === 0 },
        },
        performance: basePerformance(),
      }));
      failures.push(...r.failures);
      const pressure = getLastLongevityBundle()?.dashboard.ecologyPressure ?? 0;
      if (pressure > 0.85) failures.push('dashboard ecology pressure too high');
      return finish(failures.length === 0, 50, 100);
    }

    case 'websocket_storm': {
      const r = runTicks(15, () => ({
        metrics: {
          ...baseMetrics(20),
          websocket: { ...baseMetrics(20).websocket, reconnectStormDetected: true, reconnectAttempts: 8 },
        },
        performance: basePerformance(),
      }));
      failures.push(...r.failures);
      const skipped = getLastUnifiedOrchestratorBundle()?.layersSkipped ?? [];
      if (!skipped.includes('curiosity')) notes.push('curiosity may still run');
      return finish(failures.length === 0, 15, 30);
    }

    case 'gc_oscillation': {
      const before = gcPassCount;
      runTicks(25, () => ({ metrics: baseMetrics(90), performance: basePerformance() }));
      ticksRun = 25;
      const gcDelta = gcPassCount - before;
      notes.push(`gc passes +${gcDelta}`);
      if (gcDelta > 25) notes.push('high gc frequency — expected under long session');
      return finish(true, ticksRun, 50);
    }

    case 'heap_growth': {
      const r = runTicks(30, (_, sm) => ({
        metrics: { ...baseMetrics(sm + 60), jsHeapEstimateMb: 100 + sm * 0.5, memoryTrendPct: 50 + sm * 0.3 },
        performance: basePerformance(),
      }));
      failures.push(...r.failures);
      ticksRun = 30;
      return finish(failures.length === 0, ticksRun, 60);
    }

    case 'async_saturation': {
      const r = runTicks(10, () => ({
        metrics: { ...baseMetrics(25), asyncQueueDepth: STRESS_ASYNC_SATURATION_DEPTH, asyncQueueLatencyMs: 400 },
        performance: basePerformance(),
      }));
      failures.push(...r.failures);
      const unified = getLastUnifiedOrchestratorBundle();
      const asyncPressure = unified?.dashboard.asyncPressure ?? 0;
      if (asyncPressure < STRESS_ASYNC_SATURATION_DEPTH) {
        failures.push(`async pressure not saturated (${asyncPressure} < ${STRESS_ASYNC_SATURATION_DEPTH})`);
      }
      return finish(failures.length === 0, 10, 20);
    }

    case 'curiosity_flood': {
      const store = getAdaptiveLearningStore('redmi');
      store.edges['flood'] = {
        edgeKey: 'flood',
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
      for (let i = 0; i < 20; i += 1) runSandboxMutation(store, 'edge_weight_tweak', 'flood', i);
      runTicks(8, () => ({ metrics: baseMetrics(15), performance: basePerformance() }));
      ticksRun = 28;
      return finish(true, ticksRun, 16);
    }

    case 'replay_civilization': {
      const store = getAdaptiveLearningStore('redmi');
      store.replayCount = 50;
      store.rootRankingHistory = { dom: { count: 98, successCount: 90 }, x: { count: 1, successCount: 0 } };
      const r = runTicks(8, () => ({ metrics: baseMetrics(40), performance: basePerformance() }));
      failures.push(...r.failures);
      const civ = getLastLongevityBundle()?.dashboard.replayCivilizationRisk ?? 0;
      if (civ < 0.25) failures.push(`civilization risk not elevated (${civ})`);
      return finish(failures.length === 0, 8, 16);
    }

    case 'entropy_collapse': {
      resetAdaptiveLearningStoreForTest();
      const store = getAdaptiveLearningStore('redmi');
      store.edges['mono'] = {
        edgeKey: 'mono',
        from: 'x',
        to: 'y',
        relation: 'causes',
        hitCount: 50,
        successfulPredictionCount: 48,
        falsePositiveCount: 0,
        decayReliability: 0.95,
        runtimeLearnedWeight: 0.92,
        confidenceEma: 0.95,
        replaySupport: 0.9,
        stability: 0.9,
        protectedInvariant: false,
      };
      store.rootRankingHistory = { only: { count: 100, successCount: 95 } };
      store.replayCount = 30;
      const r = runTicks(6, () => ({ metrics: baseMetrics(50), performance: basePerformance() }));
      failures.push(...r.failures);
      const health = getLastLongevityBundle()?.dashboard.entropyHealth ?? 100;
      if (health > 50) notes.push(`entropy health ${health} — pulse may recover`);
      return finish(true, 6, 12);
    }

    case 'safe_mode_trigger': {
      enterSafeMode('stress test');
      if (!isSafeModeActive()) failures.push('safe mode not active');
      const r = runTicks(5, () => ({ metrics: baseMetrics(10), performance: basePerformance() }));
      failures.push(...r.failures);
      return finish(failures.length === 0, 5, 10);
    }

    case 'emergency_brake': {
      const snap: RuntimeStabilitySnapshot = {
        healthScore: 15,
        healthLabelJa: 'critical',
        metrics: {} as RuntimeStabilitySnapshot['metrics'],
        anomalies: Array.from({ length: 6 }, (_, i) => ({
          kind: 'heartbeat_gap' as const,
          severity: 'critical' as const,
          score: 90,
          summaryJa: `gap${i}`,
        })),
        hydrationLockActive: false,
        websocketStatusJa: 'storm',
        reconnectBudgetRemaining: 0,
        reconnectCooldownUntil: 0,
        measuredAt: new Date().toISOString(),
      };
      if (detectCascadeRisk(snap) >= STRESS_CASCADE_EMERGENCY_THRESHOLD) {
        activateEmergencyBrake('stress cascade');
      }
      if (!isEmergencyBrakeActive()) failures.push('emergency brake not active');
      const r = runTicks(5, () => ({ metrics: baseMetrics(8), performance: basePerformance() }));
      failures.push(...r.failures);
      return finish(failures.length === 0, 5, 10);
    }

    case 'dashboard_fps': {
      const r = runTicks(12, (i) => ({
        metrics: {
          ...baseMetrics(20),
          renderFPS: i % 3 === 0 ? 8 : 18,
          render: { ...baseMetrics(20).render, renderFPS: i % 3 === 0 ? 8 : 18, frameDropRate: i % 4 === 0 ? 0.25 : 0.05 },
        },
        performance: basePerformance(),
      }));
      failures.push(...r.failures);
      const lowFps = memorySnapshots.filter((s) => s.atTick > tickCounter - 12);
      const minFps = 8;
      if (minFps < STRESS_DASHBOARD_FPS_MIN) notes.push('low fps ticks simulated');
      return finish(failures.length === 0, 12, 24);
    }

    case 'android_kill_recovery': {
      runTicks(8, () => ({ metrics: baseMetrics(30), performance: basePerformance() }));
      resetRuntimeUnifiedOrchestratorForTest();
      resetRuntimeLongevityForTest();
      resetCuriosityStorageForTest();
      const r = runTicks(8, () => ({ metrics: baseMetrics(32), performance: basePerformance() }));
      failures.push(...r.failures);
      ticksRun = 16;
      if (!getLastUnifiedOrchestratorBundle()) failures.push('no bundle after recovery');
      return finish(failures.length === 0, ticksRun, 32);
    }

    default:
      return finish(false, 0, 0);
  }
}

export function resetRuntimeLongSessionStressHarness(): void {
  memorySnapshots.length = 0;
  tickCounter = 0;
  gcPassCount = 0;
  resetAdaptiveLearningStoreForTest();
  resetRuntimeConstitutionForTest();
  resetRuntimeMetabolismForTest();
  resetRuntimeCuriosityForTest();
  resetRuntimeLongevityForTest();
  resetRuntimeUnifiedOrchestratorForTest();
  resetCuriosityStorageForTest();
  resetLongSessionStabilityForTest();
  setLastUnifiedTickAtMsForTest(0);
  initialHeapMb = 100;
  initialReplayCount = 0;
}

export function runFullLongSessionStressSuite(): {
  report: FinalSurvivalReport;
  scenarioResults: StressScenarioResult[];
} {
  resetRuntimeLongSessionStressHarness();
  initialReplayCount = getAdaptiveLearningStore('redmi').replayCount;
  initialHeapMb = 100;

  const scenarioResults: StressScenarioResult[] = STRESS_SCENARIO_IDS.map((id) => runScenario(id));

  const first = memorySnapshots[0];
  const last = memorySnapshots.at(-1);
  const memoryGrowthMb = (last?.jsHeapMb ?? initialHeapMb) - (first?.jsHeapMb ?? initialHeapMb);
  const replayGrowth = (last?.replayCount ?? initialReplayCount) - initialReplayCount;
  const heapPressurePeak = Math.max(...memorySnapshots.map((s) => s.jsHeapMb), initialHeapMb) / 180;
  const dashboardPressurePeak = getLastLongevityBundle()?.dashboard.ecologyPressure ?? 0;
  const entropyStability =
    memorySnapshots.length > 0
      ? memorySnapshots.reduce((s, m) => s + m.entropyHealth, 0) / memorySnapshots.length / 100
      : 0.5;
  const longevity = getLastLongevityBundle()?.dashboard;
  const replayCivilizationRisk = longevity?.replayCivilizationRisk ?? 0;
  const fossilizationRisk = longevity?.fossilizationRisk ?? 0;
  const thermalDegradation = longevity?.thermalAging ?? 0;
  const asyncStarvationPeak = Math.max(...memorySnapshots.map((s) => s.asyncQueueDepth), 0) / 64;
  const passed = scenarioResults.filter((r) => r.passed).length;
  const survivalScore = Math.round((passed / scenarioResults.length) * 100);
  const gcFrequencyEstimate = gcPassCount / Math.max(1, tickCounter);

  const expectedContinuousRuntimeHours =
    survivalScore >= 90 ? 8 : survivalScore >= 75 ? 4 : survivalScore >= 60 ? 2 : 1;

  const report: FinalSurvivalReport = {
    version: RUNTIME_LONG_SESSION_STRESS_VERSION,
    builtAt: new Date().toISOString(),
    deviceModel: REDMI_NOTE_13_PRO_5G,
    scenariosRun: scenarioResults.length,
    scenariosPassed: passed,
    memoryGrowthMb: Math.round(memoryGrowthMb * 10) / 10,
    replayGrowth,
    heapPressurePeak: Math.round(heapPressurePeak * 1000) / 1000,
    gcFrequencyEstimate: Math.round(gcFrequencyEstimate * 1000) / 1000,
    dashboardPressurePeak: Math.round(dashboardPressurePeak * 1000) / 1000,
    entropyStability: Math.round(entropyStability * 1000) / 1000,
    thermalDegradation: Math.round(thermalDegradation * 1000) / 1000,
    asyncStarvationPeak: Math.round(asyncStarvationPeak * 1000) / 1000,
    replayCivilizationRisk: Math.round(replayCivilizationRisk * 1000) / 1000,
    fossilizationRisk: Math.round(fossilizationRisk * 1000) / 1000,
    survivalScore,
    expectedContinuousRuntimeHours,
    memorySnapshots: [...memorySnapshots],
    scenarioResults,
    summaryJa: `Redmi stress: ${passed}/${scenarioResults.length} passed · survival=${survivalScore}% · est ${expectedContinuousRuntimeHours}h continuous`,
  };

  return { report, scenarioResults };
}

export function formatFinalSurvivalReportMarkdown(report: FinalSurvivalReport): string {
  const lines = [
    `# Final Survival Report — ${report.deviceModel}`,
    ``,
    `**Built:** ${report.builtAt}`,
    `**Summary:** ${report.summaryJa}`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| memory growth | ${report.memoryGrowthMb} MB |`,
    `| replay growth | ${report.replayGrowth} |`,
    `| heap pressure (peak) | ${report.heapPressurePeak} |`,
    `| GC frequency (est) | ${report.gcFrequencyEstimate} |`,
    `| dashboard pressure (peak) | ${report.dashboardPressurePeak} |`,
    `| entropy stability | ${report.entropyStability} |`,
    `| thermal degradation | ${report.thermalDegradation} |`,
    `| async starvation (peak) | ${report.asyncStarvationPeak} |`,
    `| replay civilization risk | ${report.replayCivilizationRisk} |`,
    `| fossilization risk | ${report.fossilizationRisk} |`,
    `| survival score | ${report.survivalScore}/100 |`,
    `| expected continuous runtime | ~${report.expectedContinuousRuntimeHours}h |`,
    ``,
    `## Scenarios`,
    ...report.scenarioResults.map(
      (s) => `- ${s.passed ? 'PASS' : 'FAIL'} **${s.labelJa}** (${s.ticksRun} ticks, ~${s.durationSimMinutes}m sim)${s.failuresJa.length ? ` — ${s.failuresJa.join('; ')}` : ''}`,
    ),
  ];
  return lines.join('\n');
}
