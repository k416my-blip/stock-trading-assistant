import type { RuntimeCognitiveGovernanceTimelineEntry } from '../types/runtimeCognitiveGovernance';
import { RUNTIME_COGNITIVE_GOVERNANCE_TIMELINE_MAX } from '../constants/runtimeCognitiveGovernance';

const timeline: RuntimeCognitiveGovernanceTimelineEntry[] = [];

export function resetCognitiveGovernanceTimelineForTest(): void {
  timeline.length = 0;
}

export function recordCognitiveGovernanceTimeline(
  flow: RuntimeCognitiveGovernanceTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_COGNITIVE_GOVERNANCE_TIMELINE_MAX) timeline.shift();
}

export function getCognitiveGovernanceTimelineRecent(
  limit: number,
): RuntimeCognitiveGovernanceTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getCognitiveGovernanceTimeline(): RuntimeCognitiveGovernanceTimelineEntry[] {
  return [...timeline];
}
