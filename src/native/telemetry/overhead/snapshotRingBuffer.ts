import type { CompactedSnapshot } from '../../../types/telemetryOverhead';
import { TELEMETRY_RING_BUFFER_MAX } from '../../../constants/telemetryOverhead';

const ring: CompactedSnapshot[] = [];

export function resetSnapshotRingBufferForTest(): void {
  ring.length = 0;
}

export function pushSnapshotRing(entry: CompactedSnapshot): void {
  ring.push(entry);
  if (ring.length > TELEMETRY_RING_BUFFER_MAX) ring.shift();
}

export function getSnapshotRingBuffer(): CompactedSnapshot[] {
  return [...ring];
}

export function ringBufferFillPct(): number {
  return Math.round((ring.length / TELEMETRY_RING_BUFFER_MAX) * 100);
}
