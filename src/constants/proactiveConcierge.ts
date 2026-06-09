import type { ProactiveSuggestionPriority } from '../types/proactiveSuggestion';

/** UI: 10秒でタイムアウト表示（ハード中断は AI_MAX_IN_FLIGHT_MS） */
export const PROACTIVE_CHAT_UI_TIMEOUT_MS = 10_000;

export const PROACTIVE_SUGGESTION_MAX = 80;

export const PROACTIVE_SUPPRESS_MS: Record<ProactiveSuggestionPriority, number> = {
  critical: 15 * 60 * 1000,
  high: 30 * 60 * 1000,
  medium: 60 * 60 * 1000,
  low: 2 * 60 * 60 * 1000,
};

export const PROACTIVE_UI = {
  homeCardTitle: '未確認AI提案',
  listTitle: 'AI提案一覧',
  resumeBannerTitle: '前回からの重要変化',
  acknowledge: '確認済み',
  seeLater: '後で見る',
  viewDetail: '詳しく見る',
  retry: '再試行',
  retryPrompt: '応答に失敗しました。再試行しますか？',
  thinking: '考え中…',
  timeout: '処理中・少し時間がかかっています',
  voiceResumePrompt: '未読の重要提案があります。読み上げますか？',
  safetyFooter:
    '参考情報です。購入候補・売却候補の判断は必ずご自身で確認してください。自動売買は行いません。',
} as const;

export const PROACTIVE_CATEGORY_LABEL: Record<string, string> = {
  stale_quotes: '株価データ',
  api_failure: 'API接続',
  stop_loss_near: '損切り接近',
  take_profit_near: '利確接近',
  sharp_move: '急変動',
  volume_spike: '出来高急増',
  rsi_signal: 'RSI',
  trend_reversal: 'トレンド転換',
  dividend_ex_date: '配当権利日',
  market_regime: '市場環境',
  high_dividend_value: '高配当割安',
  portfolio_change: 'ポートフォリオ',
  urgency_signal: '緊急シグナル',
  allocation_skew: '配分偏り',
  price_delay: '価格遅延',
  news_change: 'ニュース',
  buy_candidate: '購入候補',
  sell_candidate: '売却候補',
  periodic_check: '定期確認',
  learning_tip: '学習提案',
  feature_tip: '機能提案',
};
