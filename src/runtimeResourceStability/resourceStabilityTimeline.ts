import type { ResourceStabilityTimelineEntry } from '../types/runtimeResourceStability';
import { RUNTIME_RESOURCE_STABILITY_TIMELINE_MAX } from '../constants/runtimeResourceStability';

const timeline: ResourceStabilityTimelineEntry[] = [];

export function resetResourceStabilityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordResourceStabilityTimeline(
  flow: ResourceStabilityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_RESOURCE_STABILITY_TIMELINE_MAX) timeline.shift();
}

export function getResourceStabilityTimelineRecent(limit = 6): ResourceStabilityTimelineEntry[] {
  return timeline.slice(-limit);
}
