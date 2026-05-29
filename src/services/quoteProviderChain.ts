import { TWELVE_DATA_QUOTE_TIMEOUT_MS } from '../constants/marketData';
import { getQuoteProviderOrder, QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import type { Currency, Market } from '../types';
import type { ProviderQuoteAttempt } from '../types/marketData';
import type { QuoteFetchDebugInfo } from '../types/quoteFetchDebug';
import type { ProviderQuote, QuoteProviderId } from '../types/quoteProvider';
import { normalizeYahooSymbol } from '../utils/normalizeYahooSymbol';
import {
  formatProviderAttemptLine,
  providerAttemptShortLabel,
} from '../utils/providerAttemptLabel';
import { buildProviderRequestUrl } from './quoteProviderRequestUrl';
import { QuoteProbeSession } from './marketDataProbe';
import { getQuoteForMarket, MarketDataError } from './marketDataService';
import { fetchAlphaVantageQuote } from './quoteProviders/alphaVantageQuote';
import {
  ProviderSkippedError,
  type ProviderFetchError,
} from './quoteProviders/providerFetchUtil';
import { fetchRapidApiYahooQuote } from './quoteProviders/rapidApiYahooQuote';
import { fetchStooqQuote } from './quoteProviders/stooqQuote';
import { fetchYahooFinanceQuoteForBursa } from './quoteProviders/yahooFinanceBursa';
import { fetchYahooFinanceQuote } from './quoteProviders/yahooFinanceQuote';
import { isMalaysiaMarket } from '../utils/normalizeBursaSymbol';
import { logQuoteFetchFailure } from './quoteFetchDiagnostics';
import { recordProviderAttempt } from './quoteProviderStats';
import { logPriceSourceSuccess, logProviderSwitch } from './priceSourceLog';
import {
  logProviderFailed,
  logProviderStart,
  logProviderSuccess,
} from './productionOpsLog';
import { takeLastTwelveQuoteResponseStatus } from './marketDataService';
import { takeLastYahooQuoteResponseStatus } from './quoteProviders/yahooFinanceQuote';

const rateLimitUntil = new Map<QuoteProviderId, number>();
const RATE_LIMIT_COOLDOWN_MS = 90_000;

export function isProviderRateLimited(provider: QuoteProviderId, now = Date.now()): boolean {
  const until = rateLimitUntil.get(provider);
  return until != null && now < until;
}

export function noteProviderRateLimit(provider: QuoteProviderId, ms = RATE_LIMIT_COOLDOWN_MS): void {
  rateLimitUntil.set(provider, Date.now() + ms);
  console.log('[quote-provider] RATE_LIMIT_SWITCH', {
    provider,
    label: QUOTE_PROVIDER_LABELS[provider],
    cooldownMs: ms,
  });
}

export function resetProviderRateLimits(): void {
  rateLimitUntil.clear();
}

async function fetchFromProvider(
  provider: QuoteProviderId,
  yahooSymbol: string,
  market: Market,
  currency: Currency,
  twelveDataApiKey: string,
  probe: QuoteProbeSession | undefined,
  timeoutMs: number,
  chainParams: FetchQuoteChainParams,
): Promise<ProviderQuote> {
  switch (provider) {
    case 'yahoo_finance':
      if (isMalaysiaMarket(market)) {
        return fetchYahooFinanceQuoteForBursa(
          chainParams.normalizedSymbol,
          chainParams.apiSymbol,
          currency,
          timeoutMs,
          chainParams.onSymbolExplore,
        );
      }
      return fetchYahooFinanceQuote(yahooSymbol, currency, timeoutMs);
    case 'alpha_vantage':
      return fetchAlphaVantageQuote(yahooSymbol, currency, timeoutMs);
    case 'stooq':
      return fetchStooqQuote(yahooSymbol, currency, timeoutMs);
    case 'rapidapi_yahoo':
      return fetchRapidApiYahooQuote(yahooSymbol, currency, timeoutMs);
    case 'twelve_data': {
      if (!twelveDataApiKey.trim()) {
        throw new ProviderSkippedError('twelve_data', 'Twelve Data APIキー未設定');
      }
      const twelveTimeoutMs = Math.min(timeoutMs, TWELVE_DATA_QUOTE_TIMEOUT_MS);
      const quote = await getQuoteForMarket(
        twelveDataApiKey,
        market,
        yahooSymbol,
        currency,
        {
          probe,
          timeoutMs: twelveTimeoutMs,
          maxTotalMs: TWELVE_DATA_QUOTE_TIMEOUT_MS,
        },
      );
      return { ...quote, provider: 'twelve_data' };
    }
    default:
      throw new ProviderSkippedError(provider, 'unknown provider');
  }
}

function isTwelveDataTimeoutError(mdErr: MarketDataError): boolean {
  if (mdErr.kind === 'network_timeout') return true;
  const m = (mdErr.rawMessage ?? mdErr.message).toLowerCase();
  return /timeout|timed out|aborted|タイムアウト/.test(m);
}

function providerErrorToMarketData(err: ProviderFetchError, provider: QuoteProviderId): MarketDataError {
  return new MarketDataError(err.kind, err.message, {
    httpStatus: err.httpStatus,
    rawMessage: err.rawMessage,
    lastProvider: provider,
    responseBody: err.responseBody,
    requestUrl: err.requestUrl,
  });
}

function toAttemptRecord(
  provider: QuoteProviderId,
  mdErr: MarketDataError,
): ProviderQuoteAttempt {
  return {
    provider,
    message: mdErr.rawMessage ?? mdErr.message,
    shortLabel: providerAttemptShortLabel(mdErr.httpStatus, mdErr.kind, mdErr.message),
    httpStatus: mdErr.httpStatus,
  };
}

export type FetchQuoteChainParams = {
  market: Market;
  positionSymbol: string;
  apiSymbol: string;
  normalizedSymbol: string;
  currency: Currency;
  twelveDataApiKey: string;
  probe?: QuoteProbeSession;
  timeoutMs: number;
  /** API全滅時に返す保存済み価格 */
  fallbackPrice?: number;
  onProviderTry?: (provider: QuoteProviderId, yahooSymbol: string) => void;
  onSymbolExplore?: (info: QuoteFetchDebugInfo) => void;
};

export type FetchQuoteChainResult = {
  quote: ProviderQuote | null;
  attempts: ProviderQuoteAttempt[];
  usedFallback: boolean;
  fallbackPrice?: number;
  summary?: string;
};

/**
 * Twelve Data（キーあり）→ Yahoo → Alpha。キーなしは Yahoo → Alpha。
 * throw せず結果を返す（fallbackPrice あり）。
 */
export async function fetchQuoteViaProviderChain(
  params: FetchQuoteChainParams,
): Promise<FetchQuoteChainResult> {
  const yahooSymbol = normalizeYahooSymbol(
    params.apiSymbol || params.positionSymbol,
    params.market,
  );
  const order = getQuoteProviderOrder(params.market, params.twelveDataApiKey);
  const attempts: ProviderQuoteAttempt[] = [];

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[quote-provider] ORDER', {
      market: params.market,
      hasTwelveKey: Boolean(params.twelveDataApiKey?.trim()),
      order: order.map((p) => QUOTE_PROVIDER_LABELS[p]),
    });
  }

  for (const provider of order) {
    if (isProviderRateLimited(provider)) {
      console.log('[quote-provider] SKIP_RATE_LIMITED', {
        provider,
        label: QUOTE_PROVIDER_LABELS[provider],
        yahooSymbol,
      });
      continue;
    }

    params.onProviderTry?.(provider, yahooSymbol);
    logProviderStart(provider, {
      label: QUOTE_PROVIDER_LABELS[provider],
      yahooSymbol,
      market: params.market,
    });
    console.log('[quote-provider] TRY', {
      provider,
      label: QUOTE_PROVIDER_LABELS[provider],
      yahooSymbol,
      market: params.market,
    });

    try {
      const quote = await fetchFromProvider(
        provider,
        yahooSymbol,
        params.market,
        params.currency,
        params.twelveDataApiKey,
        params.probe,
        params.timeoutMs,
        params,
      );
      recordProviderAttempt(provider, true);
      const responseStatus =
        provider === 'twelve_data'
          ? takeLastTwelveQuoteResponseStatus()
          : provider === 'yahoo_finance'
            ? takeLastYahooQuoteResponseStatus()
            : undefined;
      logPriceSourceSuccess(
        provider,
        quote.symbol ?? yahooSymbol,
        quote.price,
        responseStatus,
      );
      logProviderSuccess(provider, {
        label: QUOTE_PROVIDER_LABELS[provider],
        yahooSymbol,
        price: quote.price,
        responseStatus,
      });
      console.log('[quote-provider] SUCCESS', {
        provider,
        label: QUOTE_PROVIDER_LABELS[provider],
        yahooSymbol,
        price: quote.price,
        responseStatus,
      });
      return { quote, attempts, usedFallback: false };
    } catch (err) {
      if (err instanceof ProviderSkippedError) {
        console.log('[quote-provider] SKIPPED', {
          provider: err.provider,
          reason: err.message,
        });
        attempts.push({
          provider: err.provider,
          message: err.message,
          shortLabel: 'skipped',
        });
        continue;
      }

      const fetchErr = err as ProviderFetchError;
      const mdErr =
        err instanceof MarketDataError
          ? err
          : fetchErr.kind
            ? providerErrorToMarketData(fetchErr, provider)
            : new MarketDataError(
                'unknown',
                err instanceof Error ? err.message : '取得失敗',
                {
                  rawMessage: err instanceof Error ? err.message : String(err),
                  lastProvider: provider,
                },
              );

      recordProviderAttempt(provider, false);
      const requestUrl =
        mdErr.requestUrl ?? buildProviderRequestUrl(provider, yahooSymbol, params.market);
      const attempt = toAttemptRecord(provider, mdErr);
      attempts.push(attempt);

      logQuoteFetchFailure({
        provider,
        ticker: params.positionSymbol,
        normalizedSymbol: yahooSymbol,
        market: params.market,
        requestUrl,
        httpStatus: mdErr.httpStatus,
        errorKind: mdErr.kind,
        message: mdErr.message,
        rawMessage: mdErr.rawMessage,
        responseBody: mdErr.responseBody ?? mdErr.rawMessage,
        rateLimited: mdErr.kind === 'rate_limit',
        timedOut: mdErr.kind === 'network_timeout',
      });

      if (mdErr.kind === 'rate_limit') {
        noteProviderRateLimit(provider);
        continue;
      }

      if (provider === 'twelve_data' && isTwelveDataTimeoutError(mdErr)) {
        logProviderSwitch('twelve', 'yahoo_fallback', 'timeout');
      }

      logProviderFailed(provider, {
        label: QUOTE_PROVIDER_LABELS[provider],
        originalSymbol: params.positionSymbol,
        normalizedSymbol: yahooSymbol,
        requestUrl,
        httpStatus: mdErr.httpStatus,
        errorKind: mdErr.kind,
      });
      console.log('[quote-provider] FAIL_DETAIL', {
        provider,
        label: QUOTE_PROVIDER_LABELS[provider],
        originalSymbol: params.positionSymbol,
        normalizedSymbol: yahooSymbol,
        requestUrl,
        httpStatus: mdErr.httpStatus,
        errorKind: mdErr.kind,
        errorBody: mdErr.responseBody ?? mdErr.rawMessage ?? mdErr.message,
        uiLine: formatProviderAttemptLine(provider, attempt.shortLabel),
      });
    }
  }

  const summary = attempts
    .map((a) => formatProviderAttemptLine(a.provider, a.shortLabel))
    .join('\n');
  const fallbackPrice =
    params.fallbackPrice != null && params.fallbackPrice > 0 ? params.fallbackPrice : undefined;

  if (fallbackPrice != null) {
    console.log('[quote-provider] FALLBACK_PRICE', {
      symbol: params.positionSymbol,
      fallbackPrice,
      attempts: summary,
    });
    return {
      quote: null,
      attempts,
      usedFallback: true,
      fallbackPrice,
      summary,
    };
  }

  return {
    quote: null,
    attempts,
    usedFallback: false,
    summary,
  };
}

/** 後方互換: 失敗時のみ throw（テスト・レガシー呼び出し用） */
export async function fetchQuoteViaProviderChainOrThrow(
  params: FetchQuoteChainParams,
): Promise<ProviderQuote> {
  const result = await fetchQuoteViaProviderChain(params);
  if (result.quote) return result.quote;
  throw new MarketDataError('unknown', 'すべての価格取得元が失敗しました', {
    rawMessage: result.summary ?? 'no provider available',
  });
}
