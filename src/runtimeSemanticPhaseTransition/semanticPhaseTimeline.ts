import type { RuntimeSemanticPhaseTimelineEntry } from '../types/runtimeSemanticPhaseTransition';
import { RUNTIME_SEMANTIC_PHASE_TIMELINE_MAX } from '../constants/runtimeSemanticPhaseTransition';

const timeline: RuntimeSemanticPhaseTimelineEntry[] = [];

export function resetSemanticPhaseTimelineForTest(): void {
  timeline.length = 0;
}

export function recordSemanticPhaseTimeline(
  flow: RuntimeSemanticPhaseTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_SEMANTIC_PHASE_TIMELINE_MAX) timeline.shift();
}

export function getSemanticPhaseTimelineRecent(limit: number): RuntimeSemanticPhaseTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getSemanticPhaseTimeline(): RuntimeSemanticPhaseTimelineEntry[] {
  return [...timeline];
}
