import type { ObserverRecursionTimelineEntry } from '../types/runtimeObserverRecursion';
import { RUNTIME_OBSERVER_RECURSION_TIMELINE_MAX } from '../constants/runtimeObserverRecursion';

const timeline: ObserverRecursionTimelineEntry[] = [];

export function resetObserverRecursionTimelineForTest(): void {
  timeline.length = 0;
}

export function recordObserverRecursionTimeline(
  flow: ObserverRecursionTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_OBSERVER_RECURSION_TIMELINE_MAX) timeline.shift();
}

export function getObserverRecursionTimelineRecent(limit = 6): ObserverRecursionTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getObserverRecursionTimeline(): ObserverRecursionTimelineEntry[] {
  return [...timeline];
}
