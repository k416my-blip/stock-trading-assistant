import { TWELVE_DATA_EXCHANGE } from '../constants/marketData';
import { buildRequestUrl } from '../services/marketDataService';
import type { Market } from '../types';

const MOCK_KEY_PATTERNS = /^(mock|test|dummy|fake|sample|invalid-key|bad-key)/i;

/** APIキー状態を console に出力（値そのものは出さない） */
export function logTwelveDataApiKeyDiagnostic(apiKey: string | undefined | null, source?: string): void {
  const raw = apiKey ?? '';
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const isUndefined = apiKey === undefined;
  const isNull = apiKey === null;
  const isEmpty = trimmed.length === 0;
  const looksMock = MOCK_KEY_PATTERNS.test(trimmed);

  console.log('[TwelveData] API_KEY_DIAGNOSTIC', {
    source: source ?? 'unknown',
    isUndefined,
    isNull,
    isEmpty,
    looksMock,
    charLength: trimmed.length,
    first4: trimmed.length >= 4 ? trimmed.slice(0, 4) : '(n/a)',
    last4: trimmed.length >= 4 ? trimmed.slice(-4) : '(n/a)',
  });
}

/** 送信 URL（apikey 含む実 URL）とマスク版の両方 */
export function logTwelveDataRequestUrl(params: {
  ticker: string;
  path: string;
  queryParams: Record<string, string>;
  label?: string;
}): void {
  const actualUrl = buildRequestUrl(params.path, params.queryParams);
  const masked = buildRequestUrl(params.path, { ...params.queryParams, apikey: '***' });
  console.log('[TwelveData] REQUEST_URL', {
    label: params.label ?? params.ticker,
    ticker: params.ticker,
    actualUrl,
    maskedUrl: masked,
  });
}

/** レスポンス全文 */
export function logTwelveDataResponseFull(params: {
  ticker: string;
  requestUrl: string;
  httpStatus: number;
  body: unknown;
  elapsedMs: number;
  errorMessage?: string;
}): void {
  let bodyText: string;
  try {
    bodyText = typeof params.body === 'string' ? params.body : JSON.stringify(params.body, null, 2);
  } catch {
    bodyText = String(params.body);
  }

  console.log('[TwelveData] RESPONSE', {
    ticker: params.ticker,
    requestUrl: params.requestUrl,
    httpStatus: params.httpStatus,
    elapsedMs: params.elapsedMs,
    errorMessage: params.errorMessage,
    responseBodyFull: bodyText,
  });
}

export function logPortfolioSymbolBatch(
  symbols: Array<{ market: Market; symbol: string; normalized?: string; apiSymbol?: string }>,
): void {
  console.log('[TwelveData] PORTFOLIO_SYMBOLS', symbols.map((s) => ({
    market: s.market,
    symbol: s.symbol,
    normalized: s.normalized ?? s.symbol,
    apiSymbol: s.apiSymbol,
    exchange: TWELVE_DATA_EXCHANGE[s.market],
  })));
}
