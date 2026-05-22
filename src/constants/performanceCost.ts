/** Performance & Cost Optimization Layer */

export const API_ORCHESTRATOR_MAX_CONCURRENT = 3;

export const UNIFIED_CACHE_TTL_MS = {
  quoteMin: 60_000,
  quoteMax: 5 * 60_000,
  quoteDefault: 3 * 60_000,
  news: 30 * 60_000,
  xSentiment: 15 * 60_000,
} as const;

export const NOTIFICATION_GLOBAL_THROTTLE_MS = 2 * 60_000;
export const NOTIFICATION_GLOBAL_BURST_MAX = 6;

export const OFFLINE_PROBE_INTERVAL_MS = 45_000;

export const BATTERY_SAVER_REFRESH_MULTIPLIER = 2.5;

export const AI_CONTEXT_MAX_HOLDINGS = 8;
export const AI_CONTEXT_MAX_JOURNAL_SYMBOLS = 5;
export const AI_CONTEXT_MAX_SIMILAR_CASES = 2;

/** 推定単価（USD/MYR 概算 — ダッシュボード表示用） */
export const API_COST_ESTIMATES = {
  openAiPer1kTokensUsd: 0.002,
  xPerSearchCredits: 1,
  newsPerRequestUsd: 0.001,
} as const;

export const PERFORMANCE_COST_LABELS_JA = {
  offline: 'オフライン — 最後のキャッシュを表示しています',
  backgroundPaused: 'バックグラウンド — API更新を一時停止',
  batterySaver: 'バッテリーセーバー — 更新頻度を下げ、X APIを停止',
} as const;
