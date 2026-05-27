import type { TradingSafetyTimelineEntry } from '../types/tradingSafetyGovernance';
import { TRADING_SAFETY_TIMELINE_MAX } from '../constants/tradingSafetyGovernance';

const timeline: TradingSafetyTimelineEntry[] = [];
const riskEvolution: { at: string; risk: number }[] = [];

export function resetTradingSafetyTimelineForTest(): void {
  timeline.length = 0;
  riskEvolution.length = 0;
}

export function recordTradingSafetyTimeline(
  flow: TradingSafetyTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > TRADING_SAFETY_TIMELINE_MAX) timeline.shift();
}

export function noteRiskEvolution(risk: number): void {
  riskEvolution.push({ at: new Date().toISOString(), risk });
  if (riskEvolution.length > 64) riskEvolution.shift();
}

export function getTradingSafetyTimeline(): TradingSafetyTimelineEntry[] {
  return [...timeline];
}

export function getTradingSafetyTimelineRecent(limit = 6): TradingSafetyTimelineEntry[] {
  return timeline.slice(-limit);
}

export function getRiskEvolution(): { at: string; risk: number }[] {
  return [...riskEvolution];
}
