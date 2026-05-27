import type { RuntimeMetaLimitTimelineEntry } from '../types/runtimeMetaLimitGovernance';
import { RUNTIME_META_LIMIT_TIMELINE_MAX } from '../constants/runtimeMetaLimitGovernance';

const timeline: RuntimeMetaLimitTimelineEntry[] = [];

export function resetMetaLimitTimelineForTest(): void {
  timeline.length = 0;
}

export function recordMetaLimitTimeline(
  flow: RuntimeMetaLimitTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_META_LIMIT_TIMELINE_MAX) timeline.shift();
}

export function getMetaLimitTimelineRecent(limit: number): RuntimeMetaLimitTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getMetaLimitTimeline(): RuntimeMetaLimitTimelineEntry[] {
  return [...timeline];
}
