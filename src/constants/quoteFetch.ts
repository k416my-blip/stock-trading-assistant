/** 1回の quote HTTP 試行タイムアウト（ミリ秒） */
export const QUOTE_HTTP_TIMEOUT_MS = 15_000;

/** HTTP リトライ（指数バックオフ） */
export const QUOTE_HTTP_MAX_ATTEMPTS = 3;
export const QUOTE_HTTP_BACKOFF_MS = [1_000, 2_000, 4_000] as const;

export const QUOTE_FETCH_USER_AGENT = 'Mozilla/5.0 StockAssistant/1.0';

export const QUOTE_FETCH_ACCEPT =
  'application/json,text/plain,*/*';

export const YAHOO_HTML_BLOCK_MESSAGE =
  'Yahoo Finance がアクセスをブロックしました（HTML応答）';
