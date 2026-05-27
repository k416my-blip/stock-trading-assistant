import type { CausalTimelineEntry } from '../types/runtimeCausalIntelligence';
import { CAUSAL_INTELLIGENCE_TIMELINE_MAX } from '../constants/runtimeCausalIntelligence';

const timeline: CausalTimelineEntry[] = [];
const survivabilityEvolution: { at: string; score: number }[] = [];

export function resetSurvivabilityCausalityTimelineForTest(): void {
  timeline.length = 0;
  survivabilityEvolution.length = 0;
}

export function recordCausalTimeline(flow: CausalTimelineEntry['flow'], detailJa: string): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > CAUSAL_INTELLIGENCE_TIMELINE_MAX) timeline.shift();
}

export function noteSurvivabilityCausalScore(score: number): void {
  survivabilityEvolution.push({ at: new Date().toISOString(), score });
  if (survivabilityEvolution.length > 64) survivabilityEvolution.shift();
}

export function getCausalTimeline(): CausalTimelineEntry[] {
  return [...timeline];
}

export function getCausalTimelineRecent(limit = 6): CausalTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getSurvivabilityCausalityEvolution(): { at: string; score: number }[] {
  return [...survivabilityEvolution];
}

export function scoreSurvivabilityCausal(
  tradingScore: number,
  correlationStrength: number,
  rootCause: number,
): number {
  const raw = (tradingScore / 100) * 0.4 + correlationStrength * 0.35 + (1 - rootCause) * 0.25;
  return Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 1000;
}
