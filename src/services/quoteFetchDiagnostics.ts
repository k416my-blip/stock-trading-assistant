import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import { TWELVE_DATA_EXCHANGE } from '../constants/marketData';
import type { Market } from '../types';
import type { MarketDataErrorKind } from '../types/marketData';
import type { QuoteProviderId } from '../types/quoteProvider';
import { isDev } from '../utils/isDev';
import { logMarketData, logMarketDataSuccess } from '../utils/marketDataLog';
import { secureWarn } from './secureLogger';

export type { QuoteProviderId };

export type QuoteFetchFailureLog = {
  provider: QuoteProviderId;
  ticker: string;
  normalizedSymbol?: string;
  market?: Market;
  exchange?: string;
  mic_code?: string;
  requestUrl?: string;
  httpStatus?: number;
  errorKind: MarketDataErrorKind | 'timeout' | 'unknown';
  message: string;
  rawMessage?: string;
  responseBody?: unknown;
  timedOut?: boolean;
  rateLimited?: boolean;
  attempt?: string;
};

const MAX_BODY_CHARS = 800;

function truncateBody(body: unknown): string | undefined {
  if (body == null) return undefined;
  try {
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    if (text.length <= MAX_BODY_CHARS) return text;
    return `${text.slice(0, MAX_BODY_CHARS)}…`;
  } catch {
    return '[unserializable response body]';
  }
}

/** Structured quote failure log — always emitted (keys redacted by secureWarn). */
export function logQuoteFetchFailure(details: QuoteFetchFailureLog): void {
  const payload = {
    provider: details.provider,
    ticker: details.ticker,
    normalizedSymbol: details.normalizedSymbol ?? details.ticker,
    requestUrl: details.requestUrl,
    market: details.market,
    exchange: details.exchange,
    mic_code: details.mic_code,
    httpStatus: details.httpStatus,
    errorKind: details.errorKind,
    message: details.message,
    rawMessage: details.rawMessage,
    timedOut: details.timedOut ?? details.errorKind === 'network_timeout',
    rateLimited: details.rateLimited ?? details.errorKind === 'rate_limit',
    attempt: details.attempt,
    responseBody: truncateBody(details.responseBody),
  };
  secureWarn('[quote-fetch] failure', payload);
}

export type HoldingQuoteDiagnostic = {
  symbol: string;
  normalizedSymbol: string;
  market: Market;
  exchange?: string;
  requestUrl: string;
  provider?: QuoteProviderId;
  httpStatus?: number;
  errorType?: MarketDataErrorKind | 'timeout' | 'stale' | 'unknown';
  usedCache: boolean;
  usedLive: boolean;
};

/** 保有銘柄ごとの安全な診断ログ（APIキーは URL に含めない） */
export function logHoldingQuoteDiagnostic(details: HoldingQuoteDiagnostic): void {
  if (details.usedLive) {
    logMarketDataSuccess(
      '[quote-fetch] holding ok',
      `${details.symbol} live${details.provider ? ` ${QUOTE_PROVIDER_LABELS[details.provider]}` : ''}`,
    );
    return;
  }
  const payload = {
    symbol: details.symbol,
    normalizedSymbol: details.normalizedSymbol,
    market: details.market,
    provider: details.provider ? QUOTE_PROVIDER_LABELS[details.provider] : undefined,
    exchange: details.exchange ?? TWELVE_DATA_EXCHANGE[details.market],
    requestUrl: details.requestUrl,
    httpStatus: details.httpStatus,
    errorType: details.errorType,
    usedCache: details.usedCache,
    usedLive: details.usedLive,
  };
  if (isDev) {
    logMarketData('[quote-fetch] holding diagnostic', payload);
    return;
  }
  secureWarn('[quote-fetch] holding diagnostic', payload);
}

export function marketDataErrorToFailureLog(
  provider: QuoteProviderId,
  ticker: string,
  market: Market | undefined,
  err: { kind: MarketDataErrorKind; message: string; rawMessage?: string; httpStatus?: number },
  extra?: { exchange?: string; mic_code?: string; attempt?: string; responseBody?: unknown },
): QuoteFetchFailureLog {
  return {
    provider,
    ticker,
    market,
    exchange: extra?.exchange,
    mic_code: extra?.mic_code,
    httpStatus: err.httpStatus,
    errorKind: err.kind,
    message: err.message,
    rawMessage: err.rawMessage,
    responseBody: extra?.responseBody,
    timedOut: err.kind === 'network_timeout',
    rateLimited: err.kind === 'rate_limit',
    attempt: extra?.attempt,
  };
}
