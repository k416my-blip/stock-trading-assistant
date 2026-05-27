import type { RuntimeSemanticThermodynamicsTimelineEntry } from '../types/runtimeSemanticThermodynamics';
import { RUNTIME_SEMANTIC_THERMODYNAMICS_TIMELINE_MAX } from '../constants/runtimeSemanticThermodynamics';

const timeline: RuntimeSemanticThermodynamicsTimelineEntry[] = [];

export function resetSemanticThermodynamicsTimelineForTest(): void {
  timeline.length = 0;
}

export function recordSemanticThermodynamicsTimeline(
  flow: RuntimeSemanticThermodynamicsTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_SEMANTIC_THERMODYNAMICS_TIMELINE_MAX) timeline.shift();
}

export function getSemanticThermodynamicsTimelineRecent(limit: number): RuntimeSemanticThermodynamicsTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getSemanticThermodynamicsTimeline(): RuntimeSemanticThermodynamicsTimelineEntry[] {
  return [...timeline];
}
