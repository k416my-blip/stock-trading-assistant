import type { AiUrgency } from '../types/aiStrategyBriefing';
import type { UrgencySignalLevel } from '../types/urgencySignal';

/** Consistent urgency palette: 緊急=red, 高=orange, 中=yellow, 低=blue */
export const URGENCY_LEVEL_COLORS: Record<UrgencySignalLevel, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

export const URGENCY_AI_COLORS: Record<AiUrgency, string> = {
  critical: URGENCY_LEVEL_COLORS.critical,
  high: URGENCY_LEVEL_COLORS.high,
  medium: URGENCY_LEVEL_COLORS.medium,
  low: URGENCY_LEVEL_COLORS.low,
};

export function colorForUrgencyLevel(level: UrgencySignalLevel): string {
  return URGENCY_LEVEL_COLORS[level];
}

export function colorForAiUrgency(urgency: AiUrgency): string {
  return URGENCY_AI_COLORS[urgency];
}
