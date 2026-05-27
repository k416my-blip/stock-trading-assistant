import { RUNTIME_GOVERNANCE_FREEZE_TIMELINE_MAX } from '../constants/runtimeGovernanceFreeze';
import type { RuntimeGovernanceFreezeTimelineEntry } from '../types/runtimeGovernanceFreeze';

const timeline: RuntimeGovernanceFreezeTimelineEntry[] = [];

export function resetGovernanceFreezeTimelineForTest(): void {
  timeline.length = 0;
}

export function recordGovernanceFreezeTimeline(
  flow: RuntimeGovernanceFreezeTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_GOVERNANCE_FREEZE_TIMELINE_MAX) timeline.shift();
}

export function getGovernanceFreezeTimelineRecent(limit: number): RuntimeGovernanceFreezeTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getGovernanceFreezeTimeline(): RuntimeGovernanceFreezeTimelineEntry[] {
  return [...timeline];
}
