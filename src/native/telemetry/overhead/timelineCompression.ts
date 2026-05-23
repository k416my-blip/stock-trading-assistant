import type { CompressedTimelineEntry } from '../../../types/telemetryOverhead';

export function compressTimeline(
  events: Array<{ at: string; kind: string; detailJa: string }>,
): CompressedTimelineEntry[] {
  const buckets = new Map<string, CompressedTimelineEntry>();
  for (const e of events) {
    const key = e.kind;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        from: e.at,
        to: e.at,
        kind: e.kind,
        count: 1,
        lastDetailJa: e.detailJa,
      });
    } else {
      existing.to = e.at;
      existing.count += 1;
      existing.lastDetailJa = e.detailJa;
    }
  }
  return [...buckets.values()];
}
