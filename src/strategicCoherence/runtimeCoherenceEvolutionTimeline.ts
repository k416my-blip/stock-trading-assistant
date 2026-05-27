import type { StrategicCoherenceTimelineEntry } from '../types/strategicCoherence';
import { STRATEGIC_COHERENCE_TIMELINE_MAX } from '../constants/strategicCoherence';

const timeline: StrategicCoherenceTimelineEntry[] = [];

export function resetRuntimeCoherenceEvolutionTimelineForTest(): void {
  timeline.length = 0;
}

export function recordStrategicCoherenceTimeline(
  flow: StrategicCoherenceTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > STRATEGIC_COHERENCE_TIMELINE_MAX) timeline.shift();
}

export function getStrategicCoherenceTimeline(): StrategicCoherenceTimelineEntry[] {
  return [...timeline];
}

export function getStrategicCoherenceTimelineRecent(limit = 6): StrategicCoherenceTimelineEntry[] {
  return timeline.slice(-limit);
}
