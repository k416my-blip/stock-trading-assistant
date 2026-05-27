import type { SelfRecursionEnduranceTimelineEntry } from '../types/runtimeSelfRecursionEndurance';
import { RUNTIME_SELF_RECURSION_ENDURANCE_TIMELINE_MAX } from '../constants/runtimeSelfRecursionEndurance';

const timeline: SelfRecursionEnduranceTimelineEntry[] = [];

export function resetSelfRecursionEnduranceTimelineForTest(): void {
  timeline.length = 0;
}

export function recordSelfRecursionEnduranceTimeline(
  flow: SelfRecursionEnduranceTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_SELF_RECURSION_ENDURANCE_TIMELINE_MAX) timeline.shift();
}

export function getSelfRecursionEnduranceTimelineRecent(limit: number): SelfRecursionEnduranceTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getSelfRecursionEnduranceTimeline(): SelfRecursionEnduranceTimelineEntry[] {
  return [...timeline];
}
