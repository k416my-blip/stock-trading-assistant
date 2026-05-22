import type { MarketDataErrorKind } from '../types/marketData';

export const MARKET_DATA_ERROR_LABEL: Record<MarketDataErrorKind, string> = {
  rate_limit: 'API制限',
  symbol_invalid: '銘柄コード不正',
  empty_response: '価格データ空',
  market_closed: '市場休場',
  network_timeout: 'ネットワーク',
  server_error: 'サーバーエラー',
  unsupported_exchange: '取引所未対応',
  api_key: 'APIキー',
  unknown: 'その他',
};

const USER_MESSAGES: Record<MarketDataErrorKind, string> = {
  rate_limit: 'API制限に達した可能性があります（429）',
  symbol_invalid: '銘柄コードまたは市場設定が正しくない可能性があります',
  empty_response: '価格データが空でした（休場・未配信の可能性があります）',
  market_closed: '市場が閉まっているため価格が更新されない場合があります',
  network_timeout: 'ネットワーク接続がタイムアウトしました',
  server_error: 'データ提供側のサーバーエラーが発生しました',
  unsupported_exchange: 'この取引所はAPIでサポートされていない可能性があります',
  api_key: 'APIキーを確認してください',
  unknown: '価格を取得できませんでした。しばらくしてから再試行してください',
};

/** HTTP ステータスとメッセージからエラー種別を判定（汎用 "limit" には反応しない） */
export function classifyMarketDataError(
  message: string,
  httpStatus?: number,
): MarketDataErrorKind {
  const m = message.toLowerCase().trim();

  if (httpStatus === 429) return 'rate_limit';
  if (httpStatus === 401 || httpStatus === 403) return 'api_key';
  if (/apikey|api key|unauthorized|not authorized/.test(m)) return 'api_key';
  if (httpStatus != null && httpStatus >= 500) return 'server_error';

  if (/\b429\b/.test(m) || /too many requests/.test(m)) return 'rate_limit';
  if (/api credit|run out of|credits per|quota exceeded|maximum number of requests/.test(m)) {
    return 'rate_limit';
  }

  if (
    /exchange.*(not support|invalid|unknown|unavailable)|unsupported exchange|unknown exchange|invalid exchange/.test(
      m,
    )
  ) {
    return 'unsupported_exchange';
  }

  if (
    /symbol.*(not found|invalid|unknown)|invalid symbol|figi|ticker.*invalid|no data is available for this symbol|instrument not found|could not find symbol/.test(
      m,
    )
  ) {
    return 'symbol_invalid';
  }

  if (
    /market.*(closed|close)|outside.*(hours|session)|not open|trading session|no trading/.test(m)
  ) {
    return 'market_closed';
  }

  if (
    /timeout|timed out|network request failed|failed to fetch|econnrefused|enotfound|network error|aborted/.test(
      m,
    )
  ) {
    return 'network_timeout';
  }

  if (/empty|no price|price.*missing|previous_close.*空/.test(m) && m.includes('読み取')) {
    return 'empty_response';
  }

  if (httpStatus === 404) return 'symbol_invalid';
  if (httpStatus != null && httpStatus >= 400 && httpStatus < 500) {
    if (m.includes('exchange')) return 'unsupported_exchange';
    if (m.includes('symbol') || m.includes('figi')) return 'symbol_invalid';
    return 'unknown';
  }

  return 'unknown';
}

export function userMessageForErrorKind(kind: MarketDataErrorKind): string {
  return USER_MESSAGES[kind];
}

/** @deprecated 後方互換 — MarketDataError または生文字列 */
export function toUserFriendlyPriceError(
  err: { kind: MarketDataErrorKind; message: string } | string,
): string {
  if (typeof err === 'string') {
    return userMessageForErrorKind(classifyMarketDataError(err));
  }
  return userMessageForErrorKind(err.kind);
}

export function priceErrorCategory(kind: MarketDataErrorKind): string {
  return kind;
}
