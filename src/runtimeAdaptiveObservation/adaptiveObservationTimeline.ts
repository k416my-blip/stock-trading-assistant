import { RUNTIME_ADAPTIVE_OBSERVATION_TIMELINE_MAX } from '../constants/runtimeAdaptiveObservation';
import type { RuntimeAdaptiveObservationTimelineEntry } from '../types/runtimeAdaptiveObservation';

const timeline: RuntimeAdaptiveObservationTimelineEntry[] = [];

export function resetAdaptiveObservationTimelineForTest(): void {
  timeline.length = 0;
}

export function recordAdaptiveObservationTimeline(
  flow: RuntimeAdaptiveObservationTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_ADAPTIVE_OBSERVATION_TIMELINE_MAX) timeline.shift();
}

export function getAdaptiveObservationTimelineRecent(
  limit: number,
): RuntimeAdaptiveObservationTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getAdaptiveObservationTimeline(): RuntimeAdaptiveObservationTimelineEntry[] {
  return [...timeline];
}
