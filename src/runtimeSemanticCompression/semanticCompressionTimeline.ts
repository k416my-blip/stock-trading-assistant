import type { RuntimeSemanticCompressionTimelineEntry } from '../types/runtimeSemanticCompression';
import { RUNTIME_SEMANTIC_COMPRESSION_TIMELINE_MAX } from '../constants/runtimeSemanticCompression';

const timeline: RuntimeSemanticCompressionTimelineEntry[] = [];

export function resetSemanticCompressionTimelineForTest(): void {
  timeline.length = 0;
}

export function recordSemanticCompressionTimeline(
  flow: RuntimeSemanticCompressionTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_SEMANTIC_COMPRESSION_TIMELINE_MAX) timeline.shift();
}

export function getSemanticCompressionTimelineRecent(limit: number): RuntimeSemanticCompressionTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getSemanticCompressionTimeline(): RuntimeSemanticCompressionTimelineEntry[] {
  return [...timeline];
}
