import type { NarrativeIntegrityTimelineEntry } from '../types/runtimeNarrativeIntegrity';
import { RUNTIME_NARRATIVE_INTEGRITY_TIMELINE_MAX } from '../constants/runtimeNarrativeIntegrity';

const timeline: NarrativeIntegrityTimelineEntry[] = [];

export function resetNarrativeIntegrityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordNarrativeIntegrityTimeline(
  flow: NarrativeIntegrityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_NARRATIVE_INTEGRITY_TIMELINE_MAX) timeline.shift();
}

export function getNarrativeIntegrityTimeline(): NarrativeIntegrityTimelineEntry[] {
  return [...timeline];
}

export function getNarrativeIntegrityTimelineRecent(limit = 6): NarrativeIntegrityTimelineEntry[] {
  return timeline.slice(-limit);
}
