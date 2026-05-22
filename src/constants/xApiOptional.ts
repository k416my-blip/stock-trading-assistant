/** X API optional モード — 有料機能は無効化し無料ニュースへフォールバック */

export const X_API_OPTIONAL_MODE_LABEL = 'X API optional モード';

export const X_API_OPTIONAL_MODE_DESC_JA =
  'オン時は X の有料API（recent search 等）を呼ばず、RSS・Yahoo/Google ニュース等の無料ソースを使います。';

export const X_HTTP_402_USER_MESSAGE_JA =
  'X APIの現在プランではこの機能は利用できません';

/** 有料プラン必須の X API 機能（無効化対象） */
export const X_PAID_FEATURES_JA = [
  'recent search（ツイート検索）',
  '大量投稿取得',
  'リアルタイム監視',
] as const;

/** 無料フォールバックソース */
export const FREE_NEWS_FALLBACK_SOURCES_JA = [
  'Yahoo Finance RSS',
  'Google News RSS',
  'Finnhub news（APIキー設定時）',
  'Marketaux（APIキー設定時）',
  'News API / RSS（newsApiKey 設定時）',
] as const;
