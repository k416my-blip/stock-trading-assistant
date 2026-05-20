import type { Market } from './index';

/** Safe display labels — do not use guaranteed / must-buy / financial-advice wording. */
export type AiSuggestedAction =
  | 'suggested_buy'
  | 'suggested_reduce'
  | 'suggested_hold'
  | 'watch_closely';

export type AiUrgency = 'low' | 'medium' | 'high' | 'critical';

export type AiSuggestionExplanation = {
  technicalReasons: string[];
  macroReasons: string[];
  riskReasons: string[];
  /** Stale / freshness warning for personal review. */
  dataFreshnessNote: string;
};

export type AiStrategyBriefing = {
  marketRegimeLabel: string;
  topSuggestions: string[];
  riskMode: string;
  nextMacroEvent: string;
};

export type AiTradeQueueItem = {
  id: string;
  ticker: string;
  name: string;
  market: Market;
  suggestedAction: AiSuggestedAction;
  urgency: AiUrgency;
  /** 0–100 model confidence (mock). */
  confidence: number;
  rationaleSummary: string;
  explanation: AiSuggestionExplanation;
  /** ISO — when the signal was raised (mock/UI). */
  occurredAt: string;
  /** ISO — optional response window; past deadline → 期限切れ. */
  responseDeadlineAt?: string;
};
