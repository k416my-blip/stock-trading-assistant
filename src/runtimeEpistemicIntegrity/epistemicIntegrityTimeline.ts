import type { EpistemicIntegrityTimelineEntry } from '../types/runtimeEpistemicIntegrity';
import { RUNTIME_EPISTEMIC_INTEGRITY_TIMELINE_MAX } from '../constants/runtimeEpistemicIntegrity';

const timeline: EpistemicIntegrityTimelineEntry[] = [];

export function resetEpistemicIntegrityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordEpistemicIntegrityTimeline(
  flow: EpistemicIntegrityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_EPISTEMIC_INTEGRITY_TIMELINE_MAX) timeline.shift();
}

export function getEpistemicIntegrityTimeline(): EpistemicIntegrityTimelineEntry[] {
  return [...timeline];
}

export function getEpistemicIntegrityTimelineRecent(limit = 6): EpistemicIntegrityTimelineEntry[] {
  return timeline.slice(-limit);
}
