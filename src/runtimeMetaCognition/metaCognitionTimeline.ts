import type { MetaCognitionTimelineEntry } from '../types/runtimeMetaCognition';
import { RUNTIME_META_COGNITION_TIMELINE_MAX } from '../constants/runtimeMetaCognition';

const timeline: MetaCognitionTimelineEntry[] = [];

export function resetMetaCognitionTimelineForTest(): void {
  timeline.length = 0;
}

export function recordMetaCognitionTimeline(
  flow: MetaCognitionTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_META_COGNITION_TIMELINE_MAX) timeline.shift();
}

export function getMetaCognitionTimeline(): MetaCognitionTimelineEntry[] {
  return [...timeline];
}

export function getMetaCognitionTimelineRecent(limit = 6): MetaCognitionTimelineEntry[] {
  return timeline.slice(-limit);
}
