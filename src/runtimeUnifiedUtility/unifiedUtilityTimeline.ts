import type { UnifiedUtilityTimelineEntry } from '../types/runtimeUnifiedUtility';
import { RUNTIME_UNIFIED_UTILITY_TIMELINE_MAX } from '../constants/runtimeUnifiedUtility';

const timeline: UnifiedUtilityTimelineEntry[] = [];

export function resetUnifiedUtilityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordUnifiedUtilityTimeline(
  flow: UnifiedUtilityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_UNIFIED_UTILITY_TIMELINE_MAX) timeline.shift();
}

export function getUnifiedUtilityTimeline(): UnifiedUtilityTimelineEntry[] {
  return [...timeline];
}

export function getUnifiedUtilityTimelineRecent(limit = 6): UnifiedUtilityTimelineEntry[] {
  return timeline.slice(-limit);
}
