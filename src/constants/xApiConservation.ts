/** X API 利用量節約モード（リアルタイム監視なし・質問時のみ） */

export const X_API_BASE = 'https://api.x.com/2';

/** 同一銘柄のキャッシュ有効期間 */
export const X_SYMBOL_CACHE_TTL_MS = 15 * 60 * 1000;

/** 1回の検索で取得する最大投稿数 */
export const X_MAX_POSTS_PER_SEARCH = 20;

/** 検索 API の max_results パラメータ（Twitter API は 10〜100） */
export const X_SEARCH_MAX_RESULTS = 20;

/** 保存する要約の最大文字数 */
export const X_SUMMARY_MAX_CHARS = 280;

/** ネットワーク失敗時の再試行回数（初回のあと） */
export const X_FETCH_MAX_RETRIES = 1;

export const X_FETCH_RETRY_DELAY_MS = 2_000;

/** 1リクエストのタイムアウト */
export const X_FETCH_TIMEOUT_MS = 12_000;

/** 1日の推奨上限（超過しても動作は継続・警告のみ） */
export const X_DAILY_SOFT_LIMIT_REQUESTS = 40;

/** 月間クレジット想定（Basic 読み取り目安・表示用） */
export const X_MONTHLY_CREDIT_BUDGET = 10_000;

/** 1検索あたりの推定クレジット消費 */
export const X_CREDITS_PER_SEARCH = 1;

/** users/me 検証の推定クレジット */
export const X_CREDITS_PER_VERIFY = 1;

export const X_CONSERVATION_MODE_LABEL = 'X API 節約モード';

export const X_CONSERVATION_RULES_JA = [
  'リアルタイム監視は行いません',
  'AIコンシェルジュでX・SNSに言及した質問のときだけAPIを呼びます',
  '同一銘柄は15分キャッシュ',
  `最大${X_MAX_POSTS_PER_SEARCH}件を要約のみ保存`,
  'Bearer Token のみ（OAuth不要）',
  'HTTP 402 時は有料検索を無効化し無料ニュースへフォールバック',
] as const;
