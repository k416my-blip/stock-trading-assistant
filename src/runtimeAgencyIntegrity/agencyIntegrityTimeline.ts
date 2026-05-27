import type { AgencyIntegrityTimelineEntry } from '../types/runtimeAgencyIntegrity';
import { RUNTIME_AGENCY_INTEGRITY_TIMELINE_MAX } from '../constants/runtimeAgencyIntegrity';

const timeline: AgencyIntegrityTimelineEntry[] = [];

export function resetAgencyIntegrityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordAgencyIntegrityTimeline(
  flow: AgencyIntegrityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_AGENCY_INTEGRITY_TIMELINE_MAX) timeline.shift();
}

export function getAgencyIntegrityTimeline(): AgencyIntegrityTimelineEntry[] {
  return [...timeline];
}

export function getAgencyIntegrityTimelineRecent(limit = 6): AgencyIntegrityTimelineEntry[] {
  return timeline.slice(-limit);
}
