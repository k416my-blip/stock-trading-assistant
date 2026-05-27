import type { HomeostasisTimelineEntry } from '../types/runtimeHomeostasis';
import { RUNTIME_HOMEOSTASIS_TIMELINE_MAX } from '../constants/runtimeHomeostasis';

const timeline: HomeostasisTimelineEntry[] = [];

export function resetStabilityHomeodynamicTimelineForTest(): void {
  timeline.length = 0;
}

export function recordHomeostasisTimeline(
  flow: HomeostasisTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_HOMEOSTASIS_TIMELINE_MAX) timeline.shift();
}

export function getHomeostasisTimeline(): HomeostasisTimelineEntry[] {
  return [...timeline];
}

export function getHomeostasisTimelineRecent(limit = 6): HomeostasisTimelineEntry[] {
  return timeline.slice(-limit);
}
