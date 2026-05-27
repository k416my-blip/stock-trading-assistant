import { RUNTIME_INTER_CIVILIZATION_TIMELINE_MAX } from '../constants/runtimeInterCivilizationResonance';
import type { RuntimeInterCivilizationTimelineEntry } from '../types/runtimeInterCivilizationResonance';

const timeline: RuntimeInterCivilizationTimelineEntry[] = [];

export function resetInterCivilizationTimelineForTest(): void {
  timeline.length = 0;
}

export function recordInterCivilizationTimeline(
  flow: RuntimeInterCivilizationTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_INTER_CIVILIZATION_TIMELINE_MAX) timeline.shift();
}

export function getInterCivilizationTimelineRecent(limit: number): RuntimeInterCivilizationTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getInterCivilizationTimeline(): RuntimeInterCivilizationTimelineEntry[] {
  return [...timeline];
}
