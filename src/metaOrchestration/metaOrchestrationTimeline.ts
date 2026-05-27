import type { MetaOrchestrationTimelineEntry } from '../types/metaRuntimeOrchestration';
import { META_ORCHESTRATION_TIMELINE_MAX } from '../constants/metaRuntimeOrchestration';

const timeline: MetaOrchestrationTimelineEntry[] = [];

export function resetMetaOrchestrationTimelineForTest(): void {
  timeline.length = 0;
}

export function recordMetaOrchestrationTimeline(
  flow: MetaOrchestrationTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > META_ORCHESTRATION_TIMELINE_MAX) timeline.shift();
}

export function getMetaOrchestrationTimeline(): MetaOrchestrationTimelineEntry[] {
  return [...timeline];
}

export function getMetaOrchestrationTimelineRecent(limit = 6): MetaOrchestrationTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getPacingTimelineRecent(limit = 6): MetaOrchestrationTimelineEntry[] {
  return timeline.filter((e) => e.flow === 'cross_layer_pacing').slice(-limit);
}
