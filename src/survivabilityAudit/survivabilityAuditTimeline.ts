import type { SurvivabilityAuditTimelineEntry } from '../types/survivabilityAuditValidation';
import { SURVIVABILITY_AUDIT_TIMELINE_MAX } from '../constants/survivabilityAuditValidation';

const timeline: SurvivabilityAuditTimelineEntry[] = [];
const confidenceTimeline: { at: string; confidence: number }[] = [];

export function resetSurvivabilityAuditTimelineForTest(): void {
  timeline.length = 0;
  confidenceTimeline.length = 0;
}

export function recordSurvivabilityAuditTimeline(
  flow: SurvivabilityAuditTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > SURVIVABILITY_AUDIT_TIMELINE_MAX) timeline.shift();
}

export function noteAuditConfidence(confidence: number): void {
  confidenceTimeline.push({ at: new Date().toISOString(), confidence });
  if (confidenceTimeline.length > 64) confidenceTimeline.shift();
}

export function getSurvivabilityAuditTimeline(): SurvivabilityAuditTimelineEntry[] {
  return [...timeline];
}

export function getSurvivabilityAuditTimelineRecent(limit = 6): SurvivabilityAuditTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getAuditConfidenceTimeline(): { at: string; confidence: number }[] {
  return [...confidenceTimeline];
}

export function scoreRuntimeValidationConfidence(
  effectiveness: number,
  coverage: number,
  consistency: number,
): number {
  const conf = effectiveness * 0.4 + coverage * 0.35 + consistency * 0.25;
  return Math.round(Math.max(0, Math.min(1, conf)) * 1000) / 1000;
}
