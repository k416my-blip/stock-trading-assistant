import type { RuntimeFiniteBoundaryTimelineEntry } from '../types/runtimeFiniteBoundary';
import { RUNTIME_FINITE_BOUNDARY_TIMELINE_MAX } from '../constants/runtimeFiniteBoundary';

const timeline: RuntimeFiniteBoundaryTimelineEntry[] = [];

export function resetFiniteBoundaryTimelineForTest(): void {
  timeline.length = 0;
}

export function recordFiniteBoundaryTimeline(
  flow: RuntimeFiniteBoundaryTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_FINITE_BOUNDARY_TIMELINE_MAX) timeline.shift();
}

export function getFiniteBoundaryTimelineRecent(limit: number): RuntimeFiniteBoundaryTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getFiniteBoundaryTimeline(): RuntimeFiniteBoundaryTimelineEntry[] {
  return [...timeline];
}
