/**
 * Automated Real Device Soak Runner — execution-only (no runtime policy changes).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AutomatedSoakCompressedBundle,
  AutomatedSoakDashboard,
  AutomatedSoakExportJson,
  AutomatedSoakMeasurements,
} from '../../types/automatedSoakRunner';
import {
  AUTOMATED_SOAK_DEFAULT_TARGET_HOURS,
  AUTOMATED_SOAK_DEVICE,
  AUTOMATED_SOAK_RUNNER_VERSION,
  AUTOMATED_SOAK_STORAGE_KEY,
  SOAK_PERSIST_INTERVAL_MS,
  SOAK_SNAPSHOT_INTERVAL_MS,
  SOAK_UI_LABELS_JA,
} from '../../constants/automatedSoakRunner';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import { getAdaptiveLearningStore } from '../../runtime/analysis/adaptiveRuntimeLearningStorage';
import { getLastLongevityBundle } from '../../runtime/longevity/runtimeLongevityIntegration';
import { getLastUnifiedOrchestratorBundle } from '../../runtime/unified/runtimeUnifiedOrchestratorIntegration';
import { resolveSoakSchedulingMode, soakTickIntervalMs } from './adaptiveSoakScheduling';
import { initAndroidLifecycleStressRunner, isScreenOff } from './androidLifecycleStressRunner';
import { tickAutomatedScenarioRotator, getCurrentSoakScenario, resetAutomatedScenarioRotatorForTest } from './automatedScenarioRotator';
import { recordRuntimeSnapshot, firstSnapshot, lastSnapshot, resetRuntimeSnapshotRecorderForTest } from './runtimeSnapshotRecorder';
import {
  recordSoakTimeline,
  resetSessionTimelineForTest,
  getSoakTimelineRecent,
  getSoakTimeline,
} from './sessionTimelineRecorder';
import { getRecoveryEvents } from './recoveryTimeTracker';
import { getFreezeEvents } from './freezeDetector';
import { observeFreeze, resetFreezeDetectorForTest, getFreezeDurationTotalMs, getFreezeEventsRecent } from './freezeDetector';
import { observeDeadlock, resetDeadlockDetectorForTest } from './deadlockDetector';
import { observeTickStall, resetTickStallDetectorForTest, getTickStallFrequency } from './tickStallDetector';
import {
  resetRecoveryTimeTrackerForTest,
  averageRecoveryMs,
  recoverySuccessRate,
  getRecoveryEventsRecent,
} from './recoveryTimeTracker';
import { buildSoakMetricGraphs } from './soakMetricGraphs';
import { computeContinuousSurvivalScore } from './continuousSurvivalScore';
import { buildCrashContextExport } from './crashContextExporter';
import { getLastNativeRecoveryLatencyMs } from './nativeKillRecoveryScenario';
import { resetReplayFloodScenarioForTest } from './replayFloodScenario';
import { resetForegroundBackgroundOscillatorForTest } from './foregroundBackgroundOscillator';
import { resetNativeKillRecoveryScenarioForTest } from './nativeKillRecoveryScenario';
import { getLifecycleRecent } from './androidLifecycleStressRunner';
import { getRuntimeSnapshots } from './runtimeSnapshotRecorder';
import { guardedAsyncStoragePersist, buildOptimizedExportPayload } from '../telemetry/overhead';
import { noteAsyncStorageWrite as noteAsyncStorageFragmentation } from '../../rn/bridgeSurvivability/asyncStorageFragmentationEstimator';
import { shouldDeferAsyncStorageFlush } from '../../rn/bridgeSurvivability';
import {
  setFailureRecoverySoakHook,
  observeFailureRecovery,
  shouldRunFailureRecoverySample,
  getRecoveryClusterSummary,
} from '../../recovery/failureRecovery';
import { getLastRnBridgeSurvivabilityProfile } from '../../rn/bridgeSurvivability';
import { detectMiuiAggressiveReclaim } from '../runtime/miuiReclaimDetector';
import {
  getReconnectPerMin,
  getWsDuplicateCount,
} from '../../runtime/stability/RuntimeReconnectTracker';
import { getHeartbeatAgeMs } from '../../runtime/stability/RuntimeHeartbeatTracker';
import { getPerformanceCostSnapshot } from '../../services/performanceCostRuntime';

type Session = {
  active: boolean;
  startedAt: number;
  targetHours: number;
  lastTickAt: number;
  lastSnapshotAt: number;
  lastPersistAt: number;
  survivalScore: number;
  dashboardPressurePeak: number;
  jsStallPeak: number;
  thermalDegradationPeak: number;
  schedulingMode: import('../../types/automatedSoakRunner').SoakSchedulingMode;
};

const session: Session = {
  active: false,
  startedAt: 0,
  targetHours: AUTOMATED_SOAK_DEFAULT_TARGET_HOURS,
  lastTickAt: 0,
  lastSnapshotAt: 0,
  lastPersistAt: 0,
  survivalScore: 100,
  dashboardPressurePeak: 0,
  jsStallPeak: 0,
  thermalDegradationPeak: 0,
  schedulingMode: 'full',
};

let lifecycleInited = false;

export function resetAutomatedSoakRunnerForTest(): void {
  session.active = false;
  session.startedAt = 0;
  session.lastTickAt = 0;
  session.lastSnapshotAt = 0;
  session.lastPersistAt = 0;
  session.survivalScore = 100;
  session.dashboardPressurePeak = 0;
  session.jsStallPeak = 0;
  session.thermalDegradationPeak = 0;
  session.schedulingMode = 'full';
  resetSessionTimelineForTest();
  resetRuntimeSnapshotRecorderForTest();
  resetFreezeDetectorForTest();
  resetDeadlockDetectorForTest();
  resetTickStallDetectorForTest();
  resetRecoveryTimeTrackerForTest();
  resetAutomatedScenarioRotatorForTest();
  resetReplayFloodScenarioForTest();
  resetForegroundBackgroundOscillatorForTest();
  resetNativeKillRecoveryScenarioForTest();
}

function ensureLifecycle(): void {
  if (lifecycleInited) return;
  lifecycleInited = true;
  initAndroidLifecycleStressRunner();
}

export function startAutomatedSoakRunner(targetHours = AUTOMATED_SOAK_DEFAULT_TARGET_HOURS): void {
  ensureLifecycle();
  session.active = true;
  session.startedAt = Date.now();
  session.targetHours = Math.max(1, targetHours);
  session.lastTickAt = 0;
  session.lastSnapshotAt = 0;
  session.lastPersistAt = 0;
  session.survivalScore = 100;
  recordSoakTimeline('session_start', `automated soak started · target ${session.targetHours}h`);
  setFailureRecoverySoakHook(true);
}

export function stopAutomatedSoakRunner(): void {
  if (!session.active) return;
  session.active = false;
  recordSoakTimeline('session_stop', `automated soak stopped · survival ${session.survivalScore}`);
  setFailureRecoverySoakHook(false);
  void persistAutomatedSoakRunner();
}

export function isAutomatedSoakRunnerActive(): boolean {
  return session.active;
}

export function getAutomatedSoakElapsedMs(): number {
  if (!session.active) return 0;
  return Date.now() - session.startedAt;
}

function buildMeasurements(): AutomatedSoakMeasurements {
  const first = firstSnapshot();
  const last = lastSnapshot();
  const elapsedH = Math.max(0.01, getAutomatedSoakElapsedMs() / 3_600_000);
  const memoryDrift =
    first && last ? (last.jsHeapMb - first.jsHeapMb) / elapsedH : 0;
  const replayDrift =
    first && last ? (last.replayCount - first.replayCount) / elapsedH : 0;
  return {
    continuousUptimeMs: getAutomatedSoakElapsedMs(),
    averageRecoveryMs: averageRecoveryMs(),
    freezeDurationMsTotal: getFreezeDurationTotalMs(),
    backgroundRecoverySuccessRate: recoverySuccessRate('background'),
    websocketRecoverySuccessRate: recoverySuccessRate('websocket'),
    memoryDriftPerHourMb: Math.round(memoryDrift * 10) / 10,
    replayDriftPerHour: Math.round(replayDrift * 10) / 10,
    thermalDegradation: session.thermalDegradationPeak,
    dashboardPressurePeak: session.dashboardPressurePeak,
    tickStallFrequency: getTickStallFrequency(),
    jsStallDurationMsPeak: session.jsStallPeak,
    nativeRecoveryLatencyMs: getLastNativeRecoveryLatencyMs(),
  };
}

function encodeBase64Utf8(input: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(unescape(encodeURIComponent(input)));
  }
  const Buf = (globalThis as { Buffer?: { from(s: string, enc: string): { toString(e: string): string } } }).Buffer;
  if (Buf) return Buf.from(input, 'utf8').toString('base64');
  return input;
}

export function buildAutomatedSoakExportJson(): AutomatedSoakExportJson | null {
  if (!session.active && getRuntimeSnapshots().length === 0) return null;
  const measurements = buildMeasurements();
  return {
    version: AUTOMATED_SOAK_RUNNER_VERSION,
    exportedAt: new Date().toISOString(),
    deviceModel: AUTOMATED_SOAK_DEVICE,
    measurements,
    survivalScore: session.survivalScore,
    timeline: getSoakTimeline(),
    lifecycle: getLifecycleRecent(200),
    recoveryEvents: getRecoveryEvents(),
    freezeEvents: getFreezeEvents(),
    snapshots: getRuntimeSnapshots(),
    graphs: buildSoakMetricGraphs(),
    crashContext: buildCrashContextExport(),
  };
}

export function buildCompressedSoakBundle(): AutomatedSoakCompressedBundle | null {
  const exp = buildAutomatedSoakExportJson();
  if (!exp) return null;
  const json = JSON.stringify(exp);
  return {
    format: 'sta-soak-bundle-v1',
    compressed: true,
    payloadBase64: encodeBase64Utf8(json),
    originalBytes: json.length,
  };
}

export function formatAutomatedSoakMarkdownReport(): string {
  const exp = buildAutomatedSoakExportJson();
  if (!exp) return '# Soak Runner\n\nNo active session.';
  const m = exp.measurements;
  const lines = [
    `# Automated Soak Report — ${exp.deviceModel}`,
    ``,
    `**Exported:** ${exp.exportedAt}`,
    `**Survival score:** ${exp.survivalScore}/100`,
    ``,
    `## Measurements`,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| continuous uptime | ${(m.continuousUptimeMs / 3_600_000).toFixed(2)} h |`,
    `| average recovery | ${m.averageRecoveryMs} ms |`,
    `| freeze total | ${m.freezeDurationMsTotal} ms |`,
    `| background recovery | ${(m.backgroundRecoverySuccessRate * 100).toFixed(0)}% |`,
    `| websocket recovery | ${(m.websocketRecoverySuccessRate * 100).toFixed(0)}% |`,
    `| memory drift/h | ${m.memoryDriftPerHourMb} MB |`,
    `| replay drift/h | ${m.replayDriftPerHour} |`,
    `| thermal degradation | ${m.thermalDegradation} |`,
    `| dashboard pressure peak | ${m.dashboardPressurePeak} |`,
    `| tick stall frequency | ${m.tickStallFrequency} |`,
    `| JS stall peak | ${m.jsStallDurationMsPeak} ms |`,
    `| native recovery latency | ${m.nativeRecoveryLatencyMs} ms |`,
    ``,
    `## Graphs (sparklines)`,
    `- memory: ${exp.graphs.memoryDriftSparkline}`,
    `- replay: ${exp.graphs.replayGrowthSparkline}`,
    `- thermal: ${exp.graphs.thermalSparkline}`,
    `- ws reconnect: ${exp.graphs.wsReconnectSparkline}`,
    ``,
    `## Recent timeline`,
    ...exp.timeline.slice(-12).map((e) => `- ${e.at} **${e.kind}** ${e.detailJa}`),
  ];
  return lines.join('\n');
}

export async function persistAutomatedSoakRunner(): Promise<void> {
  const exp = buildAutomatedSoakExportJson();
  if (!exp) return;
  const perf = getPerformanceCostSnapshot();
  if (shouldDeferAsyncStorageFlush({
    renderFps: 18,
    renderBurstRate: 0,
    jsHeapMb: 0,
    memoryTrendPct: 0,
    thermalState: 'none',
    appForeground: perf.appForeground,
    screenOff: false,
    batterySaver: perf.batterySaverActive,
    asyncQueueDepth: 0,
  })) {
    return;
  }
  await guardedAsyncStoragePersist(perf.appForeground, async () => {
    noteAsyncStorageFragmentation(1);
    const optimized = buildOptimizedExportPayload({
      timeline: exp.timeline.map((t) => ({ at: t.at, kind: t.kind, detailJa: t.detailJa })),
      snapshots: exp.snapshots.map((s) => ({
        at: s.at,
        jsHeapMb: s.jsHeapMb,
        nativeHeapMb: s.nativeHeapMb,
        replayCount: s.replayCount,
        asyncQueueDepth: s.asyncQueueDepth,
      })),
      replayArchive: exp.recoveryEvents,
    });
    await AsyncStorage.setItem(
      AUTOMATED_SOAK_STORAGE_KEY,
      JSON.stringify({ ...exp, optimizedBundle: optimized.compacted, exportChunks: optimized.chunks.length }),
    );
  });
}

export function getAutomatedSoakDashboard(): AutomatedSoakDashboard | null {
  if (!session.active && getRuntimeSnapshots().length === 0) return null;
  const measurements = buildMeasurements();
  const graphs = buildSoakMetricGraphs();
  return {
    titleJa: SOAK_UI_LABELS_JA.sectionTitle,
    safetyBannerJa: SOAK_UI_LABELS_JA.safety,
    active: session.active,
    schedulingMode: session.schedulingMode,
    currentScenario: session.active ? getCurrentSoakScenario() : null,
    survivalScore: session.survivalScore,
    elapsedHours: getAutomatedSoakElapsedMs() / 3_600_000,
    targetHours: session.targetHours,
    measurements,
    graphs,
    timelineRecent: getSoakTimelineRecent(6),
    lifecycleRecent: getLifecycleRecent(4),
    recoveryRecent: getRecoveryEventsRecent(4),
    freezeRecent: getFreezeEventsRecent(3),
  };
}

export async function tickAutomatedSoakRunner(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): Promise<void> {
  if (!session.active) return;
  ensureLifecycle();

  const now = Date.now();
  const mode = resolveSoakSchedulingMode(metrics, performance, isScreenOff());
  session.schedulingMode = mode;
  const tickEvery = soakTickIntervalMs(mode);

  if (now - session.lastTickAt < tickEvery) return;
  session.lastTickAt = now;

  const replayCount = getAdaptiveLearningStore('redmi').replayCount;
  const longevity = getLastLongevityBundle()?.dashboard;
  const unified = getLastUnifiedOrchestratorBundle()?.dashboard;
  const dashboardPressure = longevity?.ecologyPressure ?? unified?.runtimePressure ?? 0;
  const tickMs = unified?.snapshotLatency ?? metrics.orchestrationDurationMs ?? 0;

  session.dashboardPressurePeak = Math.max(session.dashboardPressurePeak, dashboardPressure);
  session.thermalDegradationPeak = Math.max(
    session.thermalDegradationPeak,
    longevity?.thermalAging ?? 0,
  );
  session.jsStallPeak = Math.max(session.jsStallPeak, metrics.eventLoopLatencyMs);

  if (now - session.lastSnapshotAt >= SOAK_SNAPSHOT_INTERVAL_MS) {
    session.lastSnapshotAt = now;
    recordRuntimeSnapshot(metrics, getAutomatedSoakElapsedMs(), replayCount, dashboardPressure, tickMs);
    recordSoakTimeline('checkpoint', `snapshot · heap ${metrics.jsHeapEstimateMb}MB`);
  }

  observeFreeze(metrics.eventLoopLatencyMs);
  const deadlockRisk = observeDeadlock();
  observeTickStall(tickMs);

  const rnProfile = getLastRnBridgeSurvivabilityProfile();
  const recoveryInput = {
    eventLoopLagMs: metrics.eventLoopLatencyMs,
    renderFps: metrics.renderFPS,
    renderBurstRate: metrics.render.renderBurstRate,
    jsHeapMb: metrics.jsHeapEstimateMb,
    memoryTrendPct: metrics.memoryTrendPct,
    thermalState: metrics.thermalState,
    appForeground: performance.appForeground,
    screenOff: isScreenOff(),
    batterySaver: performance.batterySaverActive,
    asyncQueueDepth: metrics.asyncQueueDepth,
    reconnectPerMin: getReconnectPerMin(),
    wsDuplicateCount: getWsDuplicateCount(),
    heartbeatAgeMs: getHeartbeatAgeMs(),
    bridgeTrafficRate: rnProfile?.bridgeTrafficRate ?? 0,
    renderStormRisk: rnProfile?.renderStormRisk ?? 0,
    miuiAggressiveReclaim: detectMiuiAggressiveReclaim().value,
  };
  if (shouldRunFailureRecoverySample(recoveryInput)) {
    observeFailureRecovery(recoveryInput);
    const cluster = getRecoveryClusterSummary();
    if (cluster !== 'no repeated failure clusters') {
      recordSoakTimeline('checkpoint', `recovery cluster · ${cluster}`);
    }
  }

  await tickAutomatedScenarioRotator(metrics, performance);

  const measurements = buildMeasurements();
  session.survivalScore = computeContinuousSurvivalScore(
    measurements,
    getFreezeEventsRecent(100).length,
    deadlockRisk,
  );

  if (now - session.lastPersistAt >= SOAK_PERSIST_INTERVAL_MS) {
    session.lastPersistAt = now;
    await persistAutomatedSoakRunner();
  }
}

export function formatAutomatedSoakExportJson(): string {
  const exp = buildAutomatedSoakExportJson();
  return exp ? JSON.stringify(exp, null, 2) : JSON.stringify({ error: 'no soak session' });
}
