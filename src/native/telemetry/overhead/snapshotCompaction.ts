import type { CompactedSnapshot } from '../../../types/telemetryOverhead';

/** Merge adjacent snapshots within epsilon to reduce export size. */
export function compactSnapshots(
  samples: CompactedSnapshot[],
  epsilonMb = 0.5,
): CompactedSnapshot[] {
  if (samples.length <= 2) return [...samples];
  const out: CompactedSnapshot[] = [samples[0]];
  for (let i = 1; i < samples.length; i += 1) {
    const prev = out.at(-1)!;
    const cur = samples[i];
    const similar =
      Math.abs(cur.jsHeapMb - prev.jsHeapMb) < epsilonMb &&
      Math.abs(cur.nativeHeapMb - prev.nativeHeapMb) < epsilonMb &&
      cur.replayCount === prev.replayCount &&
      cur.asyncQueueDepth === prev.asyncQueueDepth;
    if (!similar) out.push(cur);
    else out[out.length - 1] = { ...cur, at: cur.at };
  }
  return out;
}

export function compactionRatio(before: number, after: number): number {
  if (before === 0) return 1;
  return Math.round((after / before) * 1000) / 1000;
}
