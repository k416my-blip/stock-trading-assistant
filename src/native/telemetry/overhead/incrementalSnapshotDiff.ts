import type { CompactedSnapshot, SnapshotDiff } from '../../../types/telemetryOverhead';

let last: CompactedSnapshot | null = null;

export function resetIncrementalSnapshotDiffForTest(): void {
  last = null;
}

export function diffSnapshot(next: CompactedSnapshot): SnapshotDiff | null {
  if (!last) {
    last = next;
    return null;
  }
  const diff: SnapshotDiff = {
    at: next.at,
    dJsHeapMb: Math.round((next.jsHeapMb - last.jsHeapMb) * 10) / 10,
    dNativeHeapMb: Math.round((next.nativeHeapMb - last.nativeHeapMb) * 10) / 10,
    dReplay: next.replayCount - last.replayCount,
    dAsyncDepth: next.asyncQueueDepth - last.asyncQueueDepth,
  };
  last = next;
  return diff;
}

export function getLastDiffBase(): CompactedSnapshot | null {
  return last;
}
