import type { TelemetryEntropyTimelineEntry } from '../types/runtimeTelemetryEntropy';
import { RUNTIME_TELEMETRY_ENTROPY_TIMELINE_MAX } from '../constants/runtimeTelemetryEntropy';

const timeline: TelemetryEntropyTimelineEntry[] = [];

export function resetTelemetryEntropyTimelineForTest(): void {
  timeline.length = 0;
}

export function recordTelemetryEntropyTimeline(
  flow: TelemetryEntropyTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > RUNTIME_TELEMETRY_ENTROPY_TIMELINE_MAX) timeline.shift();
}

export function getTelemetryEntropyTimelineRecent(limit: number): TelemetryEntropyTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getTelemetryEntropyTimeline(): TelemetryEntropyTimelineEntry[] {
  return [...timeline];
}
