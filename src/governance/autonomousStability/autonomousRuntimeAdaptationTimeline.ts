import type { AutonomousGovernanceTimelineEntry } from '../../types/autonomousStabilityGovernance';
import { AUTONOMOUS_GOVERNANCE_TIMELINE_MAX } from '../../constants/autonomousStabilityGovernance';

const timeline: AutonomousGovernanceTimelineEntry[] = [];

export function resetAutonomousRuntimeAdaptationTimelineForTest(): void {
  timeline.length = 0;
}

export function recordGovernanceTimeline(
  flow: AutonomousGovernanceTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > AUTONOMOUS_GOVERNANCE_TIMELINE_MAX) timeline.shift();
}

export function getGovernanceTimeline(): AutonomousGovernanceTimelineEntry[] {
  return [...timeline];
}

export function getGovernanceTimelineRecent(limit = 6): AutonomousGovernanceTimelineEntry[] {
  return timeline.slice(-limit);
}
