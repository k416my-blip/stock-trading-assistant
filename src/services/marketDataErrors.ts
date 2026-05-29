import type { MarketDataErrorKind, PerSymbolPriceStatus } from '../types/marketData';

export const MARKET_DATA_ERROR_LABEL: Record<MarketDataErrorKind, string> = {
  rate_limit: 'API制限',
  plan_unsupported: 'プラン未対応',
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
  rate_limit: '無料枠制限',
  plan_unsupported: '現在の Twelve Data プランでは未対応',
  symbol_invalid: '銘柄コード不正',
  empty_response: '価格データが空でした（休場・未配信の可能性があります）',
  market_closed: '市場が閉まっているため価格が更新されない場合があります',
  network_timeout: 'ネットワークエラー',
  server_error: 'Twelve Data応答エラー',
  unsupported_exchange: '銘柄コード不正',
  api_key: 'APIキーエラー',
  unknown: 'Twelve Data応答エラー',
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
  if (/available starting with the pro or venture plan|consider upgrading/.test(m)) {
    return 'plan_unsupported';
  }
  if (httpStatus != null && httpStatus >= 500) return 'server_error';

  if (/\b429\b/.test(m) || /too many requests/.test(m)) return 'rate_limit';
  if (
    /api credit|run out of|credits per|quota exceeded|maximum number of requests|credits exceeded|credit limit/.test(
      m,
    )
  ) {
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

export function priceStatusFromMarketDataError(
  kind: MarketDataErrorKind,
  message = '',
): PerSymbolPriceStatus {
  const m = message.toLowerCase();
  if (/available starting with the pro or venture plan|consider upgrading/.test(m)) {
    return 'PLAN_UNSUPPORTED';
  }
  if (/symbol.*figi.*missing.*invalid|symbol.*missing.*invalid|figi.*missing.*invalid/.test(m)) {
    return 'INVALID_SYMBOL';
  }
  if (kind === 'plan_unsupported') return 'PLAN_UNSUPPORTED';
  if (kind === 'symbol_invalid' || kind === 'unsupported_exchange') return 'INVALID_SYMBOL';
  if (kind === 'network_timeout' || kind === 'server_error') return 'NETWORK_ERROR';
  return 'TEMPORARY_FAILURE';
}
