import type { SelfLimitationTimelineEntry } from '../types/runtimeSelfLimitation';
import { RUNTIME_SELF_LIMITATION_TIMELINE_MAX } from '../constants/runtimeSelfLimitation';

const timeline: SelfLimitationTimelineEntry[] = [];

export function resetSelfLimitationTimelineForTest(): void {
  timeline.length = 0;
}

export function recordSelfLimitationTimeline(
  flow: SelfLimitationTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_SELF_LIMITATION_TIMELINE_MAX) timeline.shift();
}

export function getSelfLimitationTimeline(): SelfLimitationTimelineEntry[] {
  return [...timeline];
}

export function getSelfLimitationTimelineRecent(limit = 6): SelfLimitationTimelineEntry[] {
  return timeline.slice(-limit);
}
