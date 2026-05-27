import type { RuntimeOntologyTimelineEntry } from '../types/runtimeOntologyStabilization';
import { RUNTIME_ONTOLOGY_TIMELINE_MAX } from '../constants/runtimeOntologyStabilization';

const timeline: RuntimeOntologyTimelineEntry[] = [];

export function resetOntologyTimelineForTest(): void {
  timeline.length = 0;
}

export function recordOntologyTimeline(flow: RuntimeOntologyTimelineEntry['flow'], detailJa: string): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_ONTOLOGY_TIMELINE_MAX) timeline.shift();
}

export function getOntologyTimelineRecent(limit: number): RuntimeOntologyTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getOntologyTimeline(): RuntimeOntologyTimelineEntry[] {
  return [...timeline];
}
