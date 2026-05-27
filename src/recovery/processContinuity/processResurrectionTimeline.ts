import type { ProcessContinuityTimelineEntry } from '../../types/processContinuityRecovery';
import { PROCESS_CONTINUITY_TIMELINE_MAX } from '../../constants/processContinuityRecovery';

const timeline: ProcessContinuityTimelineEntry[] = [];

export function resetProcessResurrectionTimelineForTest(): void {
  timeline.length = 0;
}

export function recordResurrectionTimeline(
  flow: ProcessContinuityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > PROCESS_CONTINUITY_TIMELINE_MAX) timeline.shift();
}

export function getProcessResurrectionTimeline(): ProcessContinuityTimelineEntry[] {
  return [...timeline];
}

export function getResurrectionTimelineRecent(limit = 6): ProcessContinuityTimelineEntry[] {
  return timeline.slice(-limit);
}
