import { RUNTIME_OBSERVER_REALITY_TIMELINE_MAX } from '../constants/runtimeObserverRealitySelection';
import type { RuntimeObserverRealityTimelineEntry } from '../types/runtimeObserverRealitySelection';

const timeline: RuntimeObserverRealityTimelineEntry[] = [];

export function resetObserverRealityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordObserverRealityTimeline(
  flow: RuntimeObserverRealityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_OBSERVER_REALITY_TIMELINE_MAX) timeline.shift();
}

export function getObserverRealityTimelineRecent(limit: number): RuntimeObserverRealityTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getObserverRealityTimeline(): RuntimeObserverRealityTimelineEntry[] {
  return [...timeline];
}
