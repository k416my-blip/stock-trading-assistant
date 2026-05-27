import type { AmplificationTimelineEntry } from '../types/amplificationSuppression';
import { AMPLIFICATION_SUPPRESSION_TIMELINE_MAX } from '../constants/amplificationSuppression';

const timeline: AmplificationTimelineEntry[] = [];
const loadSheddingTimeline: AmplificationTimelineEntry[] = [];

export function resetAmplificationSuppressionTimelineForTest(): void {
  timeline.length = 0;
  loadSheddingTimeline.length = 0;
}

export function recordAmplificationTimeline(
  flow: AmplificationTimelineEntry['flow'],
  detailJa: string,
): void {
  const entry = { at: new Date().toISOString(), flow, detailJa };
  timeline.push(entry);
  if (flow === 'autonomous_load_shedding') loadSheddingTimeline.push(entry);
  if (timeline.length > AMPLIFICATION_SUPPRESSION_TIMELINE_MAX) timeline.shift();
  if (loadSheddingTimeline.length > 80) loadSheddingTimeline.shift();
}

export function getAmplificationTimeline(): AmplificationTimelineEntry[] {
  return [...timeline];
}

export function getAmplificationTimelineRecent(limit = 6): AmplificationTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getLoadSheddingTimeline(): AmplificationTimelineEntry[] {
  return [...loadSheddingTimeline];
}
