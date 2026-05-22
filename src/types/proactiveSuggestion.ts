import type { Market } from './index';
import type { MarketSignalKind } from './marketSignal';

export type ProactiveSuggestionPriority = 'critical' | 'high' | 'medium' | 'low';

export type ProactiveSuggestionCategory =
  | 'stale_quotes'
  | 'api_failure'
  | 'stop_loss_near'
  | 'take_profit_near'
  | 'sharp_move'
  | 'volume_spike'
  | 'rsi_signal'
  | 'trend_reversal'
  | 'dividend_ex_date'
  | 'market_regime'
  | 'high_dividend_value'
  | 'portfolio_change'
  | 'urgency_signal'
  | 'allocation_skew'
  | 'price_delay'
  | 'news_change'
  | 'buy_candidate'
  | 'sell_candidate'
  | 'periodic_check'
  | 'learning_tip'
  | 'feature_tip';

/** pending=未確認, seen_later=後で見る, acknowledged=確認済み, opened_detail=詳しく見た */
export type ProactiveSuggestionStatus = 'pending' | 'seen_later' | 'acknowledged' | 'opened_detail';

export type ProactiveSuggestion = {
  id: string;
  priority: ProactiveSuggestionPriority;
  category: ProactiveSuggestionCategory;
  dedupeKey: string;
  titleJa: string;
  bodyJa: string;
  actionHintJa: string;
  /** 提案理由（例: RSI 28, 配当利回り 6.1%） */
  reasonsJa?: string[];
  /** なぜ通知したか（実データ検知の説明） */
  notificationWhyJa?: string;
  /** 投資行動カテゴリ */
  actionCategory?: string;
  signalKind?: MarketSignalKind;
  symbol?: string;
  market?: Market;
  createdAt: string;
  updatedAt: string;
  /** Last user action timestamp (ack / see later / detail). */
  statusChangedAt?: string;
  status: ProactiveSuggestionStatus;
  source: string;
};

export type ProactiveSuggestionCandidate = Omit<
  ProactiveSuggestion,
  'id' | 'createdAt' | 'updatedAt' | 'status'
>;

export type ProactiveStateFingerprint = {
  holdingsCount: number;
  staleCount: number;
  priceSyncError?: string;
  lastSuccessAt?: string;
  urgencyIds: string[];
  portfolioValueRounded: number;
};

export type ProactiveSuggestionsPersisted = {
  version: 1;
  suggestions: ProactiveSuggestion[];
  fingerprint: ProactiveStateFingerprint | null;
  suppressUntil: Record<string, number>;
  unreadCount: number;
  lastResumeSummaryAt?: string;
};

export type ProactiveUnreadFilter = 'pending' | 'seen_later' | 'all_unhandled';

export function isUnhandledProactiveStatus(status: ProactiveSuggestionStatus): boolean {
  return status === 'pending' || status === 'seen_later';
}

export function countUnhandledProactive(suggestions: ProactiveSuggestion[]): number {
  return suggestions.filter((s) => isUnhandledProactiveStatus(s.status)).length;
}
