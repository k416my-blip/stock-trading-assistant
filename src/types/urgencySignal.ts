import type { AiSuggestedAction, AiUrgency } from './aiStrategyBriefing';

/** Display urgency for header / global signals. */
export type UrgencySignalLevel = 'critical' | 'high' | 'medium' | 'low';

export const URGENCY_SIGNAL_LEVEL_LABEL: Record<UrgencySignalLevel, string> = {
  critical: '緊急',
  high: '高',
  medium: '中',
  low: '低',
};

export const URGENCY_SIGNAL_PRIORITY: Record<UrgencySignalLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export type TradeQueueAckStatus = 'unacknowledged' | 'acknowledged' | 'expired' | 'disabled';

export type UrgencySignalSource =
  | 'trade_queue'
  | 'stale_quotes'
  | 'degraded_mode'
  | 'diagnostics'
  | 'execution_safety'
  | 'market_event';

export type UrgencySignal = {
  id: string;
  level: UrgencySignalLevel;
  ticker?: string;
  displayName?: string;
  actionLabel: string;
  reason: string;
  source: UrgencySignalSource;
  occurredAt?: string;
  responseDeadlineAt?: string;
};

export const TRADE_QUEUE_ACK_STATUS_LABEL: Record<TradeQueueAckStatus, string> = {
  unacknowledged: '未確認',
  acknowledged: '確認済み',
  expired: '期限切れ',
  disabled: '無効化',
};

export const HEADER_NO_ACTIVE_SIGNAL_JA = '現在重要シグナルなし';

export function mapAiUrgencyToSignalLevel(urgency: AiUrgency): UrgencySignalLevel {
  switch (urgency) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    default:
      return 'low';
  }
}

export function formatUrgencySignalSummary(signal: UrgencySignal): string {
  const level = URGENCY_SIGNAL_LEVEL_LABEL[signal.level];
  const ticker = signal.ticker ? `${signal.ticker} ` : '';
  return `${ticker}${signal.actionLabel} ${level}：${signal.reason}`;
}

export function actionLabelForSuggestedAction(action: AiSuggestedAction): string {
  switch (action) {
    case 'suggested_buy':
      return '買い検討';
    case 'suggested_reduce':
      return '売却検討';
    case 'watch_closely':
      return '要注視';
    default:
      return '保有推奨';
  }
}
