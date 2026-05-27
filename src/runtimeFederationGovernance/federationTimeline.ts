import type { RuntimeFederationTimelineEntry } from '../types/runtimeFederationGovernance';
import { RUNTIME_FEDERATION_TIMELINE_MAX } from '../constants/runtimeFederationGovernance';

const timeline: RuntimeFederationTimelineEntry[] = [];

export function resetFederationTimelineForTest(): void {
  timeline.length = 0;
}

export function recordFederationTimeline(
  flow: RuntimeFederationTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_FEDERATION_TIMELINE_MAX) timeline.shift();
}

export function getFederationTimelineRecent(limit: number): RuntimeFederationTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getFederationTimeline(): RuntimeFederationTimelineEntry[] {
  return [...timeline];
}
