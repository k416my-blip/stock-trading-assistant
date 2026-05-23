/**
 * Runtime Telemetry Collector — device-only observation (no runtime policy changes).
 */
import type {
  NativeDeviceTelemetryExport,
  NativeDeviceTelemetrySnapshot,
  ObserveNativeDeviceTelemetryInput,
} from '../../types/nativeDeviceTelemetry';
import {
  NATIVE_DEVICE_TELEMETRY_VERSION,
  REDMI_NOTE_13_PRO_5G_TELEMETRY,
} from '../../constants/nativeDeviceTelemetry';
import { fetchNativeRuntimeSnapshot } from '../runtime/nativeRuntimeBridge';
import { resolveAdaptiveSamplingMode, markTelemetrySampled } from './adaptiveSamplingStrategy';
import { observeJsThreadStall } from './jsThreadStallMonitor';
import { observeHermesGcMetrics, resetHermesGcMetricsForTest } from './hermesGcMetrics';
import { sampleNativeHeap } from './nativeHeapSampler';
import { observeFrameDrop, resetFrameDropDetectorForTest } from './frameDropDetector';
import { observeRenderStorm, resetRenderStormDetectorForTest } from './reactRenderStormDetector';
import { observeBridgeCongestion, resetBridgeCongestionMonitorForTest } from './bridgeCongestionMonitor';
import { observeWebSocketReconnect } from './websocketReconnectTelemetry';
import { observeBatteryDrain, resetBatteryDrainTrackerForTest } from './batteryDrainTracker';
import { observeThermalState, resetThermalStateTrackerForTest } from './thermalStateTracker';
import { observeBackgroundKill } from './backgroundKillDetector';
import {
  observeAppResumeRecovery,
  resetAppResumeRecoveryMetricsForTest,
} from './appResumeRecoveryMetrics';
import { observeAsyncQueue } from './asyncQueueProfiler';
import { observeDashboardRender, resetDashboardRenderProfilerForTest } from './dashboardRenderProfiler';
import { observeReplayGrowth, resetReplayGrowthTelemetryForTest } from './replayGrowthTelemetry';
import { observeHeapLeakTrend, resetHeapLeakTrendAnalyzerForTest } from './heapLeakTrendAnalyzer';
import { noteTickDurationMs, observeTickDurationHistogram, resetTickDurationHistogramForTest } from './tickDurationHistogram';
import { observeRuntimeFps } from './runtimeFpsTracker';
import {
  appendMemorySnapshot,
  exportMemorySnapshotsJson,
  getMemorySnapshotRecords,
  resetMemorySnapshotExporterForTest,
} from './memorySnapshotExporter';
import { buildNativePerformanceDashboard } from './nativePerformanceDashboard';
import type { NativeDeviceTelemetryDashboard } from '../../types/nativeDeviceTelemetry';
import { resetAdaptiveSamplingForTest } from './adaptiveSamplingStrategy';
import { getLastUnifiedOrchestratorBundle } from '../../runtime/unified/runtimeUnifiedOrchestratorIntegration';
import {
  wrapTelemetryCycle,
  shouldAllowHeavyTelemetryExport,
  buildOptimizedExportPayload,
  resetTelemetryOverheadForTest,
} from './overhead';

let lastSnapshot: NativeDeviceTelemetrySnapshot | null = null;
let collectTimer: ReturnType<typeof setInterval> | null = null;

export function resetNativeDeviceTelemetryForTest(): void {
  lastSnapshot = null;
  if (collectTimer) clearInterval(collectTimer);
  collectTimer = null;
  resetAdaptiveSamplingForTest();
  resetHermesGcMetricsForTest();
  resetFrameDropDetectorForTest();
  resetRenderStormDetectorForTest();
  resetBridgeCongestionMonitorForTest();
  resetBatteryDrainTrackerForTest();
  resetThermalStateTrackerForTest();
  resetAppResumeRecoveryMetricsForTest();
  resetDashboardRenderProfilerForTest();
  resetReplayGrowthTelemetryForTest();
  resetHeapLeakTrendAnalyzerForTest();
  resetTickDurationHistogramForTest();
  resetMemorySnapshotExporterForTest();
  resetTelemetryOverheadForTest();
}

export function initNativeDeviceTelemetry(): void {
  if (collectTimer) return;
  void fetchNativeRuntimeSnapshot();
}

export function noteNativeTelemetryTickDurationMs(ms: number): void {
  noteTickDurationMs(ms);
}

/** Observation-only cycle — does not mutate runtime layers. */
export function observeNativeDeviceTelemetryCycle(
  input: ObserveNativeDeviceTelemetryInput,
): NativeDeviceTelemetrySnapshot | null {
  let result: NativeDeviceTelemetrySnapshot | null = null;
  wrapTelemetryCycle(input, () => {
    result = observeNativeDeviceTelemetryCycleInner(input);
  });
  return result ?? lastSnapshot;
}

function observeNativeDeviceTelemetryCycleInner(
  input: ObserveNativeDeviceTelemetryInput,
): NativeDeviceTelemetrySnapshot | null {
  const { mode, intervalMs, shouldSample } = resolveAdaptiveSamplingMode(input);
  if (!shouldSample && lastSnapshot) return lastSnapshot;

  if (mode !== 'paused') {
    void fetchNativeRuntimeSnapshot();
  }

  const tickMs =
    input.tickDurationMs ??
    getLastUnifiedOrchestratorBundle()?.dashboard.snapshotLatency ??
    null;
  if (tickMs != null) noteTickDurationMs(tickMs);

  const m = input.metrics;
  const jsThreadStall = observeJsThreadStall(m.eventLoopLatencyMs);
  const hermesGc = mode === 'full' ? observeHermesGcMetrics(m.jsHeapEstimateMb) : lastSnapshot?.hermesGc ?? observeHermesGcMetrics(m.jsHeapEstimateMb);
  const nativeHeap = sampleNativeHeap();
  const frameDrop = observeFrameDrop(m);
  const renderStorm = mode === 'full' ? observeRenderStorm(m) : lastSnapshot?.renderStorm ?? observeRenderStorm(m);
  const bridgeCongestion = observeBridgeCongestion();
  const websocketReconnect = observeWebSocketReconnect(m);
  const batteryDrain = observeBatteryDrain(m.native.batterySaverActive || input.performance.batterySaverActive);
  const thermalState = observeThermalState(m.thermalState);
  const backgroundKill = observeBackgroundKill(m);
  const appResumeRecovery = observeAppResumeRecovery(m, input.performance.appForeground);
  const asyncQueue = observeAsyncQueue(m.asyncQueueDepth, m.asyncQueueLatencyMs);
  const dashboardRender = observeDashboardRender(m, mode);
  const replayGrowth = observeReplayGrowth();
  const heapLeakTrend = mode === 'full' ? observeHeapLeakTrend(m.jsHeapEstimateMb, m.memoryTrendPct) : lastSnapshot?.heapLeakTrend ?? observeHeapLeakTrend(m.jsHeapEstimateMb, m.memoryTrendPct);
  const tickDuration = observeTickDurationHistogram();
  const runtimeFps = observeRuntimeFps(m.renderFPS, frameDrop.droppedFramesTotal);

  appendMemorySnapshot({
    jsHeapMb: m.jsHeapEstimateMb,
    nativeHeapMb: nativeHeap.nativeHeapMb,
    replayCount: replayGrowth.replayCount,
    asyncQueueDepth: m.asyncQueueDepth,
    thermalStatus: m.thermalState,
  });

  const snapshot: NativeDeviceTelemetrySnapshot = {
    version: NATIVE_DEVICE_TELEMETRY_VERSION,
    observedAt: new Date().toISOString(),
    deviceModel: REDMI_NOTE_13_PRO_5G_TELEMETRY,
    samplingMode: mode,
    samplingIntervalMs: intervalMs,
    jsHeapMb: m.jsHeapEstimateMb,
    nativeHeapMb: nativeHeap.nativeHeapMb,
    hermesGcPerSec: hermesGc.gcEventsPerSec,
    jsThreadStallMs: jsThreadStall.stallMs,
    droppedFrames: frameDrop.droppedFramesTotal,
    averageTickMs: tickDuration.averageMs,
    maxTickMs: tickDuration.maxMs,
    replayGrowthPerMin: replayGrowth.growthPerMin,
    renderCountPerSec: renderStorm.renderCountPerSec,
    websocketReconnectCount: websocketReconnect.reconnectCount,
    asyncQueueDepth: asyncQueue.depth,
    batteryDeltaPerHourPct: batteryDrain.deltaPerHourPct,
    thermalStateDurationSec: thermalState.severeDurationSec,
    bridgeQueuePressure: bridgeCongestion.bridgeQueuePressure,
    jsThreadStall,
    hermesGc,
    nativeHeap,
    frameDrop,
    renderStorm,
    bridgeCongestion,
    websocketReconnect,
    batteryDrain,
    thermalState,
    backgroundKill,
    appResumeRecovery,
    asyncQueue,
    dashboardRender,
    replayGrowth,
    heapLeakTrend,
    tickDuration,
    runtimeFps,
    memorySnapshots: getMemorySnapshotRecords(),
    readonlyObservationOnly: true,
  };

  lastSnapshot = snapshot;
  markTelemetrySampled();
  return snapshot;
}

export function getLastNativeDeviceTelemetrySnapshot(): NativeDeviceTelemetrySnapshot | null {
  return lastSnapshot;
}

export function getNativeDeviceTelemetryDashboard(): NativeDeviceTelemetryDashboard | null {
  if (!lastSnapshot) return null;
  return buildNativePerformanceDashboard(lastSnapshot);
}

export function exportNativeDeviceTelemetryJson(
  input?: ObserveNativeDeviceTelemetryInput,
): NativeDeviceTelemetryExport | null {
  if (!lastSnapshot) return null;
  const base = {
    version: NATIVE_DEVICE_TELEMETRY_VERSION,
    exportedAt: new Date().toISOString(),
    deviceModel: REDMI_NOTE_13_PRO_5G_TELEMETRY,
    snapshot: lastSnapshot,
    memorySnapshots: getMemorySnapshotRecords(),
  };
  if (input && shouldAllowHeavyTelemetryExport(input)) {
    const optimized = buildOptimizedExportPayload({
      timeline: [],
      snapshots: base.memorySnapshots.map((s) => ({
        at: s.at,
        jsHeapMb: s.jsHeapMb,
        nativeHeapMb: s.nativeHeapMb,
        replayCount: s.replayCount,
        asyncQueueDepth: s.asyncQueueDepth,
      })),
    });
    return { ...base, optimizedBundle: optimized.compacted };
  }
  return base;
}

export function formatNativeDeviceTelemetryExportJson(): string {
  const exp = exportNativeDeviceTelemetryJson();
  if (!exp) return JSON.stringify({ error: 'no telemetry snapshot yet' });
  return JSON.stringify(exp, null, 2);
}

export { exportMemorySnapshotsJson };
