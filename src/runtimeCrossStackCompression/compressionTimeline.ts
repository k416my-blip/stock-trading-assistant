import type { CompressionTimelineEntry } from '../types/runtimeCrossStackCompression';
import { RUNTIME_CROSS_STACK_COMPRESSION_TIMELINE_MAX } from '../constants/runtimeCrossStackCompression';

const timeline: CompressionTimelineEntry[] = [];

export function resetCompressionTimelineForTest(): void {
  timeline.length = 0;
}

export function recordCompressionTimeline(flow: CompressionTimelineEntry['flow'], detailJa: string): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_CROSS_STACK_COMPRESSION_TIMELINE_MAX) timeline.shift();
}

export function getCompressionTimelineRecent(limit = 6): CompressionTimelineEntry[] {
  return timeline.slice(-limit);
}
