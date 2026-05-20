import type { Market, PriceRefreshMinutes } from '../types';

export const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

/** API呼び出しの最小間隔（レート制限対策・キュー内ギャップ） */
export const MARKET_DATA_MIN_INTERVAL_MS = 1_500;

/** グローバル市場データキュー同時実行上限 */
export const MARKET_DATA_MAX_CONCURRENT = 2;

/** 同一銘柄の再リクエスト最短間隔 */
export const MARKET_DATA_SYMBOL_COOLDOWN_MS = 60_000;

/** 429 初回バックオフ（指数倍増、上限あり） */
export const MARKET_DATA_RATE_LIMIT_BACKOFF_INITIAL_MS = 2_000;
export const MARKET_DATA_RATE_LIMIT_BACKOFF_MAX_MS = 120_000;

/** キャッシュ価格の最大有効年齢（超過はステール表示） */
export const STALE_QUOTE_MAX_AGE_MS = 15 * 60 * 1000;

/** 緊急フォールバック用キャッシュの最大年齢（それ以上は使わない） */
export const EMERGENCY_QUOTE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** 1回の quote 試行タイムアウト（ミリ秒） */
export const QUOTE_ATTEMPT_TIMEOUT_MS = 7_000;

/** 連続タイムアウトがこの回数で残りのシンボル形式試行を打ち切る */
export const BURSA_PROBE_CONSECUTIVE_TIMEOUT_ABORT = 2;

/** 銘柄ごとの成功形式キャッシュの再検証間隔（5日） */
export const BURSA_FORMAT_CACHE_REVALIDATE_MS = 5 * 24 * 60 * 60 * 1000;

/** キャッシュ形式の連続失敗がこの回数でフルプローブへ切り替え */
export const BURSA_FORMAT_FAILURE_THRESHOLD = 3;

/** 自動更新間隔のデフォルト（分） */
export const DEFAULT_PRICE_REFRESH_MINUTES: PriceRefreshMinutes = 15;

/** 自動更新間隔のデフォルト（ミリ秒） */
export const PORTFOLIO_PRICE_AUTO_REFRESH_MS = DEFAULT_PRICE_REFRESH_MINUTES * 60 * 1000;

const PRICE_REFRESH_MINUTES_LIST: PriceRefreshMinutes[] = [1, 5, 10, 15, 30, 60];

export const PRICE_REFRESH_OPTIONS: ReadonlyArray<{
  minutes: PriceRefreshMinutes;
  label: string;
}> = [
  { minutes: 1, label: '1分（上級者向け）' },
  { minutes: 5, label: '5分（短期売買向け）' },
  { minutes: 10, label: '10分' },
  { minutes: 15, label: '15分（おすすめ）' },
  { minutes: 30, label: '30分' },
  { minutes: 60, label: '1時間（省電力）' },
];

export const PRICE_REFRESH_SETTINGS = {
  sectionDescription: '株価をどれくらいの頻度で自動更新するか設定します',
  beginnerWarning: '更新頻度を短くするとAPI通信量が増えます',
  apiLimitWarning: 'API制限に達する可能性があります',
} as const;

/** 5分以下はAPI制限リスクが高いとみなす */
export function isHighApiRiskRefreshInterval(minutes: PriceRefreshMinutes): boolean {
  return minutes <= 5;
}

export function isPriceRefreshMinutes(value: unknown): value is PriceRefreshMinutes {
  return (
    typeof value === 'number' &&
    PRICE_REFRESH_MINUTES_LIST.includes(value as PriceRefreshMinutes)
  );
}

export function priceRefreshMs(minutes: PriceRefreshMinutes): number {
  return minutes * 60 * 1000;
}

export function getPriceRefreshLabel(minutes: PriceRefreshMinutes): string {
  return PRICE_REFRESH_OPTIONS.find((o) => o.minutes === minutes)?.label ?? '15分（おすすめ）';
}

/** Twelve Data exchange パラメータ（マレーシア・香港） */
export const TWELVE_DATA_EXCHANGE: Record<Market, string | undefined> = {
  bursa: 'XKLS',
  us: undefined,
  hk: 'XHKG',
};

/** Twelve Data mic_code（ISO 10383） */
export const TWELVE_DATA_MIC: Record<Market, string | undefined> = {
  bursa: 'XKLS',
  us: undefined,
  hk: 'XHKG',
};

export const MARKET_DATA_MESSAGES = {
  loading: '株価を取得中です',
  fetchFailed: '株価の取得に失敗しました',
  checkApiKey: 'APIキーを確認してください',
  marketClosed: '市場が閉まっているため最新価格ではない可能性があります',
  priceUnavailable: '価格未取得',
  priceUnavailableHint: 'APIキー・銘柄コード・市場を確認してください',
  autoPriceNote: '自動取得価格は参考値です。実際の注文前にRakuten Tradeの価格を必ず確認してください。',
  noApiKey: 'Twelve Data APIキーが未設定です。「APIキー設定」から登録してください。',
  manualPriceButton: '現在株価を手動入力',
  fixSymbolButton: '銘柄コードを修正',
  fixMarketButton: '市場を修正',
  aggregatedFetchFailed: (count: number) =>
    `株価取得に失敗: ${count}件\n詳細は更新結果を確認してください`,
  priceLabelManual: '手動価格',
  priceLabelStale: '前回取得価格',
  priceLabelStaleAge: '取得から時間経過',
  priceLabelCached: 'キャッシュ価格',
  priceLabelStaleBadge: '古いデータ',
  priceLabelAuto: '自動',
  offlineBanner: '市場APIに接続できません。最後に取得した価格を表示しています。',
} as const;
