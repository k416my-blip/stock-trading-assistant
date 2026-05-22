import { AI_NOISE_FILTER_MAX_CHANGE_PCT } from '../constants/conciergeUx';
import type { ProactiveSuggestionCandidate } from '../types/proactiveSuggestion';

/**
 * 小さな変動だけの low 優先度候補を抑制
 */
export function shouldSuppressLowSignalProactive(
  candidate: ProactiveSuggestionCandidate,
  intradayChangePct?: number | null,
): boolean {
  if (candidate.priority === 'critical' || candidate.priority === 'high') {
    return false;
  }
  if (candidate.actionCategory === 'panic') {
    return false;
  }
  if (
    intradayChangePct != null &&
    Math.abs(intradayChangePct) < AI_NOISE_FILTER_MAX_CHANGE_PCT &&
    candidate.priority === 'low'
  ) {
    return true;
  }
  if (candidate.category === 'periodic_check' && candidate.priority === 'low') {
    return true;
  }
  return false;
}
