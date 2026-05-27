import type { RuntimeCivilizationTopologyTimelineEntry } from '../types/runtimeCivilizationTopology';
import { RUNTIME_CIVILIZATION_TOPOLOGY_TIMELINE_MAX } from '../constants/runtimeCivilizationTopology';

const timeline: RuntimeCivilizationTopologyTimelineEntry[] = [];

export function resetCivilizationTopologyTimelineForTest(): void {
  timeline.length = 0;
}

export function recordCivilizationTopologyTimeline(
  flow: RuntimeCivilizationTopologyTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_CIVILIZATION_TOPOLOGY_TIMELINE_MAX) timeline.shift();
}

export function getCivilizationTopologyTimelineRecent(
  limit: number,
): RuntimeCivilizationTopologyTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getCivilizationTopologyTimeline(): RuntimeCivilizationTopologyTimelineEntry[] {
  return [...timeline];
}
