/**
 * Telemetry overhead reduction — monitoring-only (no runtime policy changes).
 */
import type { TelemetryOverheadDashboard } from '../../../types/telemetryOverhead';
import type { ObserveNativeDeviceTelemetryInput } from '../../../types/nativeDeviceTelemetry';
import { TELEMETRY_OVERHEAD_UI_JA } from '../../../constants/telemetryOverhead';
import {
  resolveTelemetryThrottleMode,
  throttleIntervalMs,
  shouldSkipHeavyTelemetry,
  type ThrottleInput,
} from './adaptiveTelemetryThrottling';
import { pushSnapshotRing, getSnapshotRingBuffer, ringBufferFillPct, resetSnapshotRingBufferForTest } from './snapshotRingBuffer';
import { diffSnapshot, resetIncrementalSnapshotDiffForTest } from './incrementalSnapshotDiff';
import { compactSnapshots, compactionRatio } from './snapshotCompaction';
import { compressTimeline } from './timelineCompression';
import { coalesceEvent, resetEventCoalescingForTest, coalescedPendingCount } from './eventCoalescing';
import { noteDriftSample, aggregateDriftPerHour, resetDriftAggregationWindowForTest } from './driftAggregationWindow';
import { canAsyncStorageWrite, noteAsyncStorageWrite, resetAsyncStorageBurstLimiterForTest } from './asyncStorageBurstLimiter';
import { shouldSuppressBackgroundWrites } from './backgroundMinimalTelemetryMode';
import { TELEMETRY_DASHBOARD_ROW_BUDGET } from '../../../constants/telemetryOverhead';
import { getAdaptiveLearningStore } from '../../../runtime/analysis/adaptiveRuntimeLearningStorage';
import { decimatedSparkline } from './graphDecimation';
import { pruneReplayArchive } from './replayArchivePruning';
import { streamExportChunks } from './exportChunkStreaming';
import { buildCompressedTelemetryBundle } from './compressedTelemetryBundle';
import {
  canRunHeavyExport,
  noteTelemetryUserInteraction,
  resetIdleOnlyHeavyExportForTest,
} from './idleOnlyHeavyExport';
import { isThermalExportPaused } from './thermalSafeTelemetryMode';
import {
  beginDashboardRenderFrame,
  consumeDashboardRow,
  resetDashboardRenderBudgetForTest,
} from './dashboardRenderBudget';
import { virtualizeRows, visibleRowCount } from './dashboardVirtualization';
import {
  buildTelemetryOverheadProfile,
  noteTelemetryCpuSample,
  noteSnapshotWrite,
  noteExportDuration,
  noteGraphRenderMs,
  noteCompressionRatio,
  noteTelemetryDrift,
  noteOverheadMode,
  resetTelemetryOverheadProfilerForTest,
} from './telemetryOverheadProfiler';

let lastThrottleAt = 0;
let lastMode = resolveTelemetryThrottleMode({
  appForeground: true,
  screenOff: false,
  batterySaver: false,
  thermal: 'none',
  jsStallMs: 0,
  memoryTrendPct: 0,
  jsHeapMb: 0,
});

export function resetTelemetryOverheadForTest(): void {
  lastThrottleAt = 0;
  resetSnapshotRingBufferForTest();
  resetIncrementalSnapshotDiffForTest();
  resetEventCoalescingForTest();
  resetDriftAggregationWindowForTest();
  resetAsyncStorageBurstLimiterForTest();
  resetIdleOnlyHeavyExportForTest();
  resetDashboardRenderBudgetForTest();
  resetTelemetryOverheadProfilerForTest();
}

export function gateTelemetryCycle(input: ObserveNativeDeviceTelemetryInput): {
  allowed: boolean;
  mode: typeof lastMode;
} {
  const throttleInput: ThrottleInput = {
    appForeground: input.performance.appForeground,
    screenOff:
      input.metrics.native.appState === 'inactive' ||
      input.performance.appStateLabel === 'inactive',
    batterySaver: input.performance.batterySaverActive || input.metrics.native.batterySaverActive,
    thermal: input.metrics.thermalState,
    jsStallMs: input.metrics.eventLoopLatencyMs,
    memoryTrendPct: input.metrics.memoryTrendPct,
    jsHeapMb: input.metrics.jsHeapEstimateMb,
  };
  const mode = resolveTelemetryThrottleMode(throttleInput);
  lastMode = mode;
  noteOverheadMode(mode);
  const now = Date.now();
  const interval = throttleIntervalMs(mode);
  if (now - lastThrottleAt < interval) {
    return { allowed: false, mode };
  }
  lastThrottleAt = now;
  return { allowed: true, mode };
}

export function recordTelemetrySnapshotSample(input: ObserveNativeDeviceTelemetryInput): void {
  const nativeTel = input.metrics.jsHeapEstimateMb;
  const entry = {
    at: new Date().toISOString(),
    jsHeapMb: input.metrics.jsHeapEstimateMb,
    nativeHeapMb: Math.round(nativeTel * 0.55),
    replayCount: getAdaptiveLearningStore('redmi').replayCount,
    asyncQueueDepth: input.metrics.asyncQueueDepth,
  };
  pushSnapshotRing(entry);
  diffSnapshot(entry);
  noteDriftSample(entry.jsHeapMb, entry.replayCount);
  noteSnapshotWrite();
  const drift = aggregateDriftPerHour();
  noteTelemetryDrift(drift.telemetryDrift);
}

export function recordCoalescedTimelineEvent(kind: string, detailJa: string): boolean {
  return coalesceEvent(kind, detailJa);
}

export function guardedAsyncStoragePersist(
  appForeground: boolean,
  writer: () => Promise<void>,
): Promise<void> {
  if (!appForeground && shouldSuppressBackgroundWrites(appForeground)) {
    return Promise.resolve();
  }
  if (!canAsyncStorageWrite()) return Promise.resolve();
  noteAsyncStorageWrite();
  return writer();
}

export async function buildOptimizedExportPayloadAsync(raw: {
  timeline: Array<{ at: string; kind: string; detailJa: string }>;
  snapshots: Array<{ at: string; jsHeapMb: number; nativeHeapMb: number; replayCount: number; asyncQueueDepth: number }>;
  replayArchive?: unknown[];
  allowCooperativeYield?: boolean;
}): Promise<{
  compacted: ReturnType<typeof buildCompressedTelemetryBundle>;
  chunks: ReturnType<typeof streamExportChunks>;
  timeline: ReturnType<typeof compressTimeline>;
}> {
  const started = Date.now();
  const ring = getSnapshotRingBuffer();
  const merged = raw.snapshots.length > 0 ? raw.snapshots : ring;
  const compactedSnaps = compactSnapshots(merged);
  noteCompressionRatio(compactionRatio(merged.length, compactedSnaps.length));
  const timeline = compressTimeline(raw.timeline);
  const replayArchive = pruneReplayArchive(raw.replayArchive ?? []);
  const payload = { timeline, snapshots: compactedSnaps, replayArchive };
  let json: string;
  if (raw.allowCooperativeYield) {
    const { exportWithCooperativeYield } = await import('../../../scheduler/jsThreadStabilization');
    const parts = await exportWithCooperativeYield([
      () => JSON.stringify({ timeline, snapshots: compactedSnaps.slice(0, Math.ceil(compactedSnaps.length / 2)) }),
      () => JSON.stringify({ snapshots: compactedSnaps.slice(Math.ceil(compactedSnaps.length / 2)), replayArchive }),
    ]);
    json = `[${parts.join(',')}]`.replace('][', ',');
  } else {
    json = JSON.stringify(payload);
  }
  const compacted = buildCompressedTelemetryBundle(payload, compactedSnaps.length, merged.length);
  const chunks = streamExportChunks(json);
  noteExportDuration(Date.now() - started);
  return { compacted, chunks, timeline };
}

export function buildOptimizedExportPayload(raw: {
  timeline: Array<{ at: string; kind: string; detailJa: string }>;
  snapshots: Array<{ at: string; jsHeapMb: number; nativeHeapMb: number; replayCount: number; asyncQueueDepth: number }>;
  replayArchive?: unknown[];
}): {
  compacted: ReturnType<typeof buildCompressedTelemetryBundle>;
  chunks: ReturnType<typeof streamExportChunks>;
  timeline: ReturnType<typeof compressTimeline>;
} {
  const started = Date.now();
  const ring = getSnapshotRingBuffer();
  const merged = raw.snapshots.length > 0 ? raw.snapshots : ring;
  const compactedSnaps = compactSnapshots(merged);
  noteCompressionRatio(compactionRatio(merged.length, compactedSnaps.length));
  const timeline = compressTimeline(raw.timeline);
  const replayArchive = pruneReplayArchive(raw.replayArchive ?? []);
  const payload = { timeline, snapshots: compactedSnaps, replayArchive };
  const json = JSON.stringify(payload);
  const compacted = buildCompressedTelemetryBundle(payload, compactedSnaps.length, merged.length);
  const chunks = streamExportChunks(json);
  noteExportDuration(Date.now() - started);
  return { compacted, chunks, timeline };
}

export function buildDecimatedGraph(values: number[]): { sparkline: string; ms: number } {
  const started = Date.now();
  const sparkline = decimatedSparkline(values);
  const ms = Date.now() - started;
  noteGraphRenderMs(ms);
  return { sparkline, ms };
}

export function shouldAllowHeavyTelemetryExport(
  input: ObserveNativeDeviceTelemetryInput,
): boolean {
  if (isThermalExportPaused(input.metrics.thermalState)) return false;
  if (shouldSkipHeavyTelemetry(lastMode)) return false;
  return canRunHeavyExport(input.performance.appForeground);
}

export function beginTelemetryDashboardRender(): void {
  beginDashboardRenderFrame();
}

export function consumeTelemetryDashboardRow(): boolean {
  return consumeDashboardRow();
}

export function virtualizeTelemetryDashboardRows<T>(rows: T[]): T[] {
  return virtualizeRows(rows);
}

export function wrapTelemetryCycle(
  input: ObserveNativeDeviceTelemetryInput,
  run: () => void,
): void {
  const started = Date.now();
  const gate = gateTelemetryCycle(input);
  if (!gate.allowed) return;
  run();
  recordTelemetrySnapshotSample(input);
  noteTelemetryCpuSample(Date.now() - started);
}

export function getTelemetryOverheadDashboard(): TelemetryOverheadDashboard {
  const profile = buildTelemetryOverheadProfile();
  return {
    titleJa: TELEMETRY_OVERHEAD_UI_JA.sectionTitle,
    safetyBannerJa: TELEMETRY_OVERHEAD_UI_JA.safety,
    profile,
    ringBufferFillPct: ringBufferFillPct(),
    coalescedEventsPending: coalescedPendingCount(),
    exportPaused: profile.mode === 'thermal_pause',
    visibleDashboardRows: visibleRowCount(TELEMETRY_DASHBOARD_ROW_BUDGET),
  };
}

export { noteTelemetryUserInteraction };
