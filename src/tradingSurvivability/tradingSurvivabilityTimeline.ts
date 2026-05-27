import type { TradingSurvivabilityTimelineEntry } from '../types/tradingSurvivabilityOrchestration';
import { TRADING_SURVIVABILITY_TIMELINE_MAX } from '../constants/tradingSurvivabilityOrchestration';

const timeline: TradingSurvivabilityTimelineEntry[] = [];

export function resetTradingSurvivabilityTimelineForTest(): void {
  timeline.length = 0;
}

export function recordTradingSurvivabilityTimeline(
  flow: TradingSurvivabilityTimelineEntry['flow'],
  detailJa: string,
): void {
  timeline.push({ at: new Date().toISOString(), flow, detailJa });
  if (timeline.length > TRADING_SURVIVABILITY_TIMELINE_MAX) timeline.shift();
}

export function getTradingSurvivabilityTimeline(): TradingSurvivabilityTimelineEntry[] {
  return [...timeline];
}

export function getTradingSurvivabilityTimelineRecent(limit = 6): TradingSurvivabilityTimelineEntry[] {
  return timeline.slice(-limit);
}
