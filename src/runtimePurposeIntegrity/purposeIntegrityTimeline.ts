import type { PurposeIntegrityTimelineEntry } from '../types/runtimePurposeIntegrity';
import { RUNTIME_PURPOSE_INTEGRITY_TIMELINE_MAX } from '../constants/runtimePurposeIntegrity';

const timeline: PurposeIntegrityTimelineEntry[] = [];

export function resetPurposeIntegrityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordPurposeIntegrityTimeline(
  flow: PurposeIntegrityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_PURPOSE_INTEGRITY_TIMELINE_MAX) timeline.shift();
}

export function getPurposeIntegrityTimeline(): PurposeIntegrityTimelineEntry[] {
  return [...timeline];
}

export function getPurposeIntegrityTimelineRecent(limit = 6): PurposeIntegrityTimelineEntry[] {
  return timeline.slice(-limit);
}
