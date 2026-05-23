/** Tick Snapshot Coordinator — unified snapshot timing. */
import { getRuntimeClockMs } from './runtimeClockAuthority';

let lastSnapshotAtMs = 0;
let lastSnapshotLatencyMs = 0;

export function resetTickSnapshotCoordinatorForTest(): void {
  lastSnapshotAtMs = 0;
  lastSnapshotLatencyMs = 0;
}

export function beginTickSnapshot(): number {
  return getRuntimeClockMs();
}

export function endTickSnapshot(startMs: number): number {
  const end = getRuntimeClockMs();
  lastSnapshotLatencyMs = Math.max(0, end - startMs);
  lastSnapshotAtMs = end;
  return lastSnapshotLatencyMs;
}

export function getSnapshotLatencyMs(): number {
  return lastSnapshotLatencyMs;
}
