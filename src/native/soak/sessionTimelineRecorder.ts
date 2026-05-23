import type { AutomatedSoakScenarioId, SoakTimelineEvent, SoakTimelineEventKind } from '../../types/automatedSoakRunner';
import { recordCoalescedTimelineEvent } from '../telemetry/overhead';

const timeline: SoakTimelineEvent[] = [];

export function resetSessionTimelineForTest(): void {
  timeline.length = 0;
}

export function recordSoakTimeline(
  kind: SoakTimelineEventKind,
  detailJa: string,
  scenario?: AutomatedSoakScenarioId,
): void {
  if (!recordCoalescedTimelineEvent(kind, detailJa)) return;
  timeline.push({
    at: new Date().toISOString(),
    kind,
    scenario,
    detailJa,
  });
  if (timeline.length > 500) timeline.shift();
}

export function getSoakTimeline(): SoakTimelineEvent[] {
  return [...timeline];
}

export function getSoakTimelineRecent(limit = 8): SoakTimelineEvent[] {
  return timeline.slice(-limit);
}
