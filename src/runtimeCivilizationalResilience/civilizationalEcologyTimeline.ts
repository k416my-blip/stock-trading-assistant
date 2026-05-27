import type { CivilizationalEcologyTimelineEntry } from '../types/runtimeCivilizationalResilience';
import { RUNTIME_CIVILIZATIONAL_RESILIENCE_TIMELINE_MAX } from '../constants/runtimeCivilizationalResilience';

const timeline: CivilizationalEcologyTimelineEntry[] = [];

export function resetCivilizationalEcologyTimelineForTest(): void {
  timeline.length = 0;
}

export function recordCivilizationalEcologyTimeline(
  flow: CivilizationalEcologyTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_CIVILIZATIONAL_RESILIENCE_TIMELINE_MAX) timeline.shift();
}

export function getCivilizationalEcologyTimeline(): CivilizationalEcologyTimelineEntry[] {
  return [...timeline];
}

export function getCivilizationalEcologyTimelineRecent(
  limit = 6,
): CivilizationalEcologyTimelineEntry[] {
  return timeline.slice(-limit);
}
