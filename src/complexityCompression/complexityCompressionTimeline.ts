import type {
  ComplexityCompressionObserveInput,
  ComplexityCompressionTimelineEntry,
} from '../types/complexityCompression';
import { COMPLEXITY_COMPRESSION_TIMELINE_MAX } from '../constants/complexityCompression';

const timeline: ComplexityCompressionTimelineEntry[] = [];

export function resetComplexityCompressionTimelineForTest(): void {
  timeline.length = 0;
}

export function recordComplexityCompressionTimeline(
  flow: ComplexityCompressionTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > COMPLEXITY_COMPRESSION_TIMELINE_MAX) timeline.shift();
}

export function getComplexityCompressionTimeline(): ComplexityCompressionTimelineEntry[] {
  return [...timeline];
}

export function getComplexityCompressionTimelineRecent(limit = 6): ComplexityCompressionTimelineEntry[] {
  return timeline.slice(-limit);
}
