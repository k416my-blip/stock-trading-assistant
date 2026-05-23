import type { SoakRuntimeSnapshotSample } from '../../types/automatedSoakRunner';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { getLastNativeDeviceTelemetrySnapshot } from '../telemetry';

const snapshots: SoakRuntimeSnapshotSample[] = [];

export function resetRuntimeSnapshotRecorderForTest(): void {
  snapshots.length = 0;
}

export function recordRuntimeSnapshot(
  metrics: RuntimeTelemetryMetricsSnapshot,
  elapsedMs: number,
  replayCount: number,
  dashboardPressure: number,
  tickMs: number,
): void {
  const nativeTel = getLastNativeDeviceTelemetrySnapshot();
  snapshots.push({
    at: new Date().toISOString(),
    elapsedMs,
    jsHeapMb: metrics.jsHeapEstimateMb,
    nativeHeapMb: nativeTel?.nativeHeapMb ?? 0,
    replayCount,
    asyncQueueDepth: metrics.asyncQueueDepth,
    thermalStatus: metrics.thermalState,
    dashboardPressure,
    tickMs,
    wsReconnects: metrics.websocket.reconnectAttempts,
  });
  if (snapshots.length > 480) snapshots.shift();
}

export function getRuntimeSnapshots(): SoakRuntimeSnapshotSample[] {
  return [...snapshots];
}

export function firstSnapshot(): SoakRuntimeSnapshotSample | undefined {
  return snapshots[0];
}

export function lastSnapshot(): SoakRuntimeSnapshotSample | undefined {
  return snapshots.at(-1);
}
