import type { MemorySnapshotExportRecord } from '../../types/nativeDeviceTelemetry';
import type { NativeThermalStatus } from '../../types/runtimeTelemetry';
import { NATIVE_TELEMETRY_MEMORY_SNAPSHOT_MAX } from '../../constants/nativeDeviceTelemetry';

const records: MemorySnapshotExportRecord[] = [];

export function resetMemorySnapshotExporterForTest(): void {
  records.length = 0;
}

export function appendMemorySnapshot(input: {
  jsHeapMb: number;
  nativeHeapMb: number;
  replayCount: number;
  asyncQueueDepth: number;
  thermalStatus: NativeThermalStatus;
}): void {
  records.push({
    at: new Date().toISOString(),
    ...input,
  });
  if (records.length > NATIVE_TELEMETRY_MEMORY_SNAPSHOT_MAX) records.shift();
}

export function getMemorySnapshotRecords(): MemorySnapshotExportRecord[] {
  return [...records];
}

export function exportMemorySnapshotsJson(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), records }, null, 2);
}
