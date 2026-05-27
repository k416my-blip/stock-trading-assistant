import type { RuntimeSemanticGravityTimelineEntry } from '../types/runtimeSemanticGravity';
import { RUNTIME_SEMANTIC_GRAVITY_TIMELINE_MAX } from '../constants/runtimeSemanticGravity';

const timeline: RuntimeSemanticGravityTimelineEntry[] = [];

export function resetSemanticGravityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordSemanticGravityTimeline(
  flow: RuntimeSemanticGravityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_SEMANTIC_GRAVITY_TIMELINE_MAX) timeline.shift();
}

export function getSemanticGravityTimelineRecent(limit: number): RuntimeSemanticGravityTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getSemanticGravityTimeline(): RuntimeSemanticGravityTimelineEntry[] {
  return [...timeline];
}
