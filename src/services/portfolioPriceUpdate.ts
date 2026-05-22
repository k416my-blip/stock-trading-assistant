import {
  MARKET_DATA_MESSAGES,
  PORTFOLIO_REFRESH_TIMEOUT_MS,
  PORTFOLIO_SYMBOL_FETCH_DELAY_MS,
  QUOTE_ATTEMPT_TIMEOUT_MS,
  QUOTE_RETRY_DELAYS_MS,
  TWELVE_DATA_EXCHANGE,
} from '../constants/marketData';
import { getMarketSession } from './marketSession';
import { validatePositionSymbol } from './marketDataValidation';
import { QuoteProbeSession } from './marketDataProbe';
import { recordInvalidSymbolSkip } from './marketDataDiagnostics';
import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import {
  buildSafeMarketDataUrl,
  getExchangeRate,
  MarketDataError,
  MarketDataStaleRequestError,
  resetStuckMarketDataQueue,
} from './marketDataService';
import {
  fetchQuoteViaProviderChain,
  resetProviderRateLimits,
  type FetchQuoteChainResult,
} from './quoteProviderChain';
import { formatProviderAttemptLine } from '../utils/providerAttemptLabel';
import { hydrateYahooSymbolAliasCache } from './yahooSymbolAliasCache';
import {
  logQuoteProviderSuccessRates,
  resetQuoteProviderStats,
} from './quoteProviderStats';
import { buildYahooChartUrl } from './quoteProviders/yahooFinanceQuote';
import type { QuoteFetchDebugInfo } from '../types/quoteFetchDebug';
import { SYMBOL_EXPLORING_MESSAGE } from '../constants/yahooFinance';
import { formatQuotePriceDisplay } from '../utils/formatQuotePrice';
import { sanitizeErrorForUi } from '../utils/sanitizeUiError';
import type { QuoteProviderId } from '../types/quoteProvider';
import { getEmergencyCachedQuote, saveCachedQuote } from './quoteCache';
import {
  countActiveHoldings,
  rejectEmptyPortfolioReplace,
} from './portfolioPersistenceGuard';
import { rollbackPortfolioSync, saveHealthyPortfolioLists } from './portfolioSnapshot';
import { mergeCompanyName } from '../utils/companyNameResolver';
import { positionDisplayName } from './sellAllHoldings';
import type { AppState, PortfolioPosition } from '../types';
import type { Market } from '../types';
import type {
  ApiConnectionPhase,
  PortfolioSyncProgress,
  PriceSyncFailure,
  PriceSyncResult,
} from '../types/marketData';
import { delayMs } from './twelveDataQuoteRetry';
import { logHoldingQuoteDiagnostic, logQuoteFetchFailure } from './quoteFetchDiagnostics';
import { formatQuoteErrorForUser } from '../utils/formatQuoteError';
import { isDev } from '../utils/isDev';
import {
  logPortfolioSymbolBatch,
  logTwelveDataApiKeyDiagnostic,
} from '../utils/quoteFetchDebugLog';
import {
  applyApiCachedQuote,
  applyApiQuoteFailure,
  applyApiQuoteSuccess,
  buildPriceSyncFailure,
  failureHasDisplayablePrice,
  finalizePriceSyncResult,
  isLiveQuoteSuccess,
  preserveHoldingCurrentPrice,
  sanitizeHoldingPosition,
} from './holdingPriceCore';
import { normalizeYahooSymbol } from '../utils/normalizeYahooSymbol';
import { normalizeQuotePrice, safePrice, safeShares } from '../utils/safeNumeric';
import { logMarketData, logMarketDataSuccess } from '../utils/marketDataLog';
import { createRefreshDeadline } from '../utils/withTimeout';
import { withTimeout } from '../utils/withTimeout';

function uniquePositions(portfolio: PortfolioPosition[]): PortfolioPosition[] {
  const seen = new Set<string>();
  return portfolio.filter((p) => {
    const key = `${p.market}:${p.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function positionKey(position: PortfolioPosition): string {
  return `${position.market}:${position.symbol}`;
}

function markPositionsPending(
  portfolio: PortfolioPosition[],
  market: Market,
  symbol: string,
): PortfolioPosition[] {
  return portfolio.map((p) =>
    p.market === market && p.symbol === symbol
      ? { ...sanitizeHoldingPosition(p), priceFetchStatus: 'pending' as const }
      : p,
  );
}

function failureReasonFromError(err: unknown, market: Market): string {
  return formatQuoteErrorForUser(err, market);
}

function buildQuoteRequestUrl(market: Market, apiSymbol: string): string {
  const params: Record<string, string> = { symbol: apiSymbol };
  const exchange = TWELVE_DATA_EXCHANGE[market];
  if (exchange) params.exchange = exchange;
  return buildSafeMarketDataUrl('/quote', params);
}

/** @deprecated use sanitizeHoldingPosition */
export const sanitizePortfolioPosition = sanitizeHoldingPosition;

export function sanitizePortfolio(portfolio: PortfolioPosition[]): PortfolioPosition[] {
  return portfolio.map(sanitizeHoldingPosition);
}

function applyFailureToPortfolio(
  portfolio: PortfolioPosition[],
  position: PortfolioPosition,
  cached: Awaited<ReturnType<typeof getEmergencyCachedQuote>>,
): { portfolio: PortfolioPosition[]; usedCache: boolean } {
  let usedCache = false;
  const next = portfolio.map((p) => {
    if (p.symbol !== position.symbol || p.market !== position.market) return p;
    if (cached) {
      usedCache = true;
      return applyApiCachedQuote(p, cached);
    }
    return applyApiQuoteFailure(p);
  });
  return { portfolio: next, usedCache };
}

function errToConnectionPhase(err: unknown): ApiConnectionPhase {
  if (!(err instanceof MarketDataError)) return 'error';
  if (err.kind === 'network_timeout') return 'timeout';
  if (err.kind === 'rate_limit') return 'rate_limit';
  return 'error';
}

async function fetchOnePositionQuote(
  apiKey: string,
  position: PortfolioPosition,
  apiSymbol: string,
  sentSymbol: string,
  normalizedSymbol: string,
  quoteProbe: QuoteProbeSession,
  deadline: ReturnType<typeof createRefreshDeadline>,
  onProgress?: (progress: PortfolioSyncProgress) => void,
): Promise<
  | { ok: true; price: number; datetime?: string; provider: QuoteProviderId; companyName?: string }
  | {
      ok: false;
      err: unknown;
      usedCache: boolean;
      usedSavedPrice?: boolean;
      phase: ApiConnectionPhase;
      providerAttempts?: FetchQuoteChainResult['attempts'];
    }
> {
  if (deadline.isExpired()) {
    return {
      ok: false,
      err: new MarketDataError('network_timeout', MARKET_DATA_MESSAGES.refreshTimeout),
      usedCache: false,
      phase: 'timeout',
    };
  }

  const perQuoteTimeout = Math.min(QUOTE_ATTEMPT_TIMEOUT_MS, deadline.remainingMs());
  onProgress?.({
    phase: 'connecting',
    symbol: position.symbol,
    sentSymbol,
    detail: `送信symbol: ${sentSymbol}`,
  });

  const savedPrice = preserveHoldingCurrentPrice(position);

  try {
    const chainResult = await fetchQuoteViaProviderChain({
      market: position.market,
      positionSymbol: position.symbol,
      apiSymbol,
      normalizedSymbol,
      currency: position.currency,
      twelveDataApiKey: apiKey,
      probe: quoteProbe,
      timeoutMs: perQuoteTimeout,
      fallbackPrice: savedPrice,
      onProviderTry: (provider, yahooSymbol) => {
        onProgress?.({
          phase: position.market === 'bursa' ? 'symbol_exploring' : 'connecting',
          symbol: position.symbol,
          sentSymbol: yahooSymbol,
          provider,
          detail:
            position.market === 'bursa'
              ? `${SYMBOL_EXPLORING_MESSAGE}\n価格取得元: ${QUOTE_PROVIDER_LABELS[provider]}`
              : `価格取得元: ${QUOTE_PROVIDER_LABELS[provider]}\n送信symbol: ${yahooSymbol}`,
        });
      },
      onSymbolExplore: (info: QuoteFetchDebugInfo) => {
        const formal = info.resolvedSymbol;
        const priceLine =
          info.price != null ? formatQuotePriceDisplay(info.price) : undefined;
        onProgress?.({
          phase: info.price != null ? 'success' : 'symbol_exploring',
          symbol: position.symbol,
          sentSymbol: formal ?? info.triedSymbols?.slice(-1)?.[0],
          resolvedSymbol: formal,
          provider: info.provider ?? 'yahoo_finance',
          debug: {
            ...info,
            lastError: info.lastError ? sanitizeErrorForUi(info.lastError) : undefined,
          },
          detail: [
            SYMBOL_EXPLORING_MESSAGE,
            formal ? `正式symbol: ${formal}` : null,
            priceLine,
          ]
            .filter(Boolean)
            .join('\n'),
        });
      },
    });

    if (!chainResult.quote && chainResult.usedFallback && savedPrice > 0) {
      const providerLines =
        chainResult.attempts.map((a) => formatProviderAttemptLine(a.provider, a.shortLabel)).join('\n') ||
        chainResult.summary;
      onProgress?.({
        phase: 'cached',
        symbol: position.symbol,
        sentSymbol,
        detail: [
          MARKET_DATA_MESSAGES.offlineBanner,
          providerLines,
          `保存済み価格: ${formatQuotePriceDisplay(savedPrice)}`,
        ]
          .filter(Boolean)
          .join('\n'),
      });
      return {
        ok: false,
        err: new MarketDataError('unknown', MARKET_DATA_MESSAGES.offlineBanner, {
          rawMessage: providerLines,
        }),
        usedCache: true,
        usedSavedPrice: true,
        phase: 'cached',
        providerAttempts: chainResult.attempts,
      };
    }

    if (!chainResult.quote) {
      const providerLines =
        chainResult.attempts.map((a) => formatProviderAttemptLine(a.provider, a.shortLabel)).join('\n') ||
        'すべての価格取得元が失敗しました';
      return {
        ok: false,
        err: new MarketDataError('unknown', providerLines, { rawMessage: providerLines }),
        usedCache: false,
        phase: 'error',
        providerAttempts: chainResult.attempts,
      };
    }

    const quote = chainResult.quote;
    logHoldingQuoteDiagnostic({
      symbol: position.symbol,
      normalizedSymbol: apiSymbol,
      market: position.market,
      provider: quote.provider,
      exchange: TWELVE_DATA_EXCHANGE[position.market],
      requestUrl: buildYahooChartUrl(sentSymbol),
      usedCache: false,
      usedLive: true,
    });
    onProgress?.({
      phase: 'success',
      symbol: position.symbol,
      sentSymbol: quote.symbol ?? sentSymbol,
      resolvedSymbol: quote.symbol ?? sentSymbol,
      provider: quote.provider,
      detail: [
        `価格取得元: ${QUOTE_PROVIDER_LABELS[quote.provider]}`,
        `正式symbol: ${quote.symbol ?? sentSymbol}`,
        formatQuotePriceDisplay(quote.price),
      ].join('\n'),
      debug: {
        resolvedSymbol: quote.symbol ?? sentSymbol,
        price: quote.price,
        provider: quote.provider,
      },
    });
    const normalizedPrice = normalizeQuotePrice(quote.price);
    if (normalizedPrice == null) {
      return {
        ok: false,
        err: new MarketDataError('empty_response', MARKET_DATA_MESSAGES.priceUnavailable, {
          rawMessage: `invalid quote price: ${String(quote.price)}`,
          lastProvider: quote.provider,
        }),
        usedCache: false,
        phase: 'error',
        providerAttempts: chainResult.attempts,
      };
    }
    return {
      ok: true,
      price: normalizedPrice,
      datetime: quote.datetime,
      provider: quote.provider,
      companyName: quote.companyName,
    };
  } catch (err) {
    if (err instanceof MarketDataStaleRequestError) {
      const cached = await getEmergencyCachedQuote(position.market, position.symbol);
      logHoldingQuoteDiagnostic({
        symbol: position.symbol,
        normalizedSymbol: apiSymbol,
        market: position.market,
        exchange: TWELVE_DATA_EXCHANGE[position.market],
        requestUrl: buildQuoteRequestUrl(position.market, apiSymbol),
        errorType: 'stale',
        usedCache: cached != null,
        usedLive: false,
      });
      const phase = errToConnectionPhase(err);
      onProgress?.({ phase, symbol: position.symbol, detail: err instanceof Error ? err.message : undefined });
      return { ok: false, err, usedCache: cached != null, phase };
    }

    const mdErr =
      err instanceof MarketDataError ? err : createMarketDataErrorFromUnknown(err);
    const phase = errToConnectionPhase(mdErr);

    logHoldingQuoteDiagnostic({
      symbol: position.symbol,
      normalizedSymbol: apiSymbol,
      market: position.market,
      exchange: TWELVE_DATA_EXCHANGE[position.market],
      requestUrl: buildQuoteRequestUrl(position.market, apiSymbol),
      httpStatus: mdErr.httpStatus,
      errorType: mdErr.kind,
      usedCache: false,
      usedLive: false,
    });

    const detail = formatQuoteErrorForUser(mdErr, position.market);
    onProgress?.({
      phase,
      symbol: position.symbol,
      sentSymbol,
      detail: `送信symbol: ${sentSymbol}\n${detail}`,
    });

    const cached = await getEmergencyCachedQuote(position.market, position.symbol);
    return { ok: false, err: mdErr, usedCache: cached != null, phase };
  }
}

async function fetchOnePositionQuoteWithRetry(
  apiKey: string,
  position: PortfolioPosition,
  apiSymbol: string,
  sentSymbol: string,
  normalizedSymbol: string,
  quoteProbe: QuoteProbeSession,
  deadline: ReturnType<typeof createRefreshDeadline>,
  onProgress?: (progress: PortfolioSyncProgress) => void,
): Promise<
  Awaited<ReturnType<typeof fetchOnePositionQuote>>
> {
  const delays = [...QUOTE_RETRY_DELAYS_MS];
  let last: Awaited<ReturnType<typeof fetchOnePositionQuote>> = {
    ok: false,
    err: new MarketDataError('unknown', MARKET_DATA_MESSAGES.priceUnavailable),
    usedCache: false,
    phase: 'error',
  };

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    if (deadline.isExpired()) break;
    last = await fetchOnePositionQuote(
      apiKey,
      position,
      apiSymbol,
      sentSymbol,
      normalizedSymbol,
      quoteProbe,
      deadline,
      onProgress,
    );
    if (last.ok) return last;
    if (attempt < delays.length) {
      const waitMs = delays[attempt];
      console.log('[portfolio-refresh] RETRY', {
        symbol: position.symbol,
        apiSymbol: sentSymbol,
        attempt: attempt + 1,
        waitMs,
      });
      await delayMs(waitMs);
    }
  }
  return last;
}

function createMarketDataErrorFromUnknown(err: unknown): MarketDataError {
  if (err instanceof MarketDataError) return err;
  const message = err instanceof Error ? err.message : '取得に失敗しました';
  if (/タイムアウト|timeout|aborted/i.test(message)) {
    return new MarketDataError('network_timeout', message, {
      rawMessage: message,
    });
  }
  return new MarketDataError('unknown', message, { rawMessage: message });
}

function recordPositionFailure(
  failures: PriceSyncFailure[],
  position: PortfolioPosition,
  name: string,
  reason: string,
  extra?: Partial<PriceSyncFailure>,
): void {
  failures.push(buildPriceSyncFailure(position, name, reason, extra));
}

export type SyncPortfolioPricesOptions = {
  onProgress?: (progress: PortfolioSyncProgress) => void;
  /** 指定時は該当銘柄のみ再取得（失敗銘柄のリトライ用） */
  symbolsOnly?: Array<{ market: Market; symbol: string }>;
};

export async function syncPortfolioPrices(
  apiKey: string,
  portfolio: PortfolioPosition[],
  options?: SyncPortfolioPricesOptions,
): Promise<{
  portfolio: PortfolioPosition[];
  result: PriceSyncResult;
}> {
  const onProgress = options?.onProgress;
  const baseline = sanitizePortfolio(portfolio);
  if (countActiveHoldings(baseline) > 0) {
    await saveHealthyPortfolioLists(baseline);
  }

  logTwelveDataApiKeyDiagnostic(apiKey, 'syncPortfolioPrices');
  resetQuoteProviderStats();
  resetProviderRateLimits();
  await hydrateYahooSymbolAliasCache();

  if (!apiKey.trim()) {
    console.log('[quote-provider] Twelve Dataキー未設定 — Yahoo Finance等を優先使用');
  }

  if (baseline.length === 0) {
    return {
      portfolio: baseline,
      result: finalizePriceSyncResult({
        ok: true,
        updatedCount: 0,
        failures: [],
        marketClosedHint: false,
      }),
    };
  }

  const deadline = createRefreshDeadline(PORTFOLIO_REFRESH_TIMEOUT_MS);
  const failures: PriceSyncFailure[] = [];
  let updated = [...baseline];
  let updatedCount = 0;
  let timedOut = false;
  let lastPriceProvider: QuoteProviderId | undefined;
  const markets = new Set(baseline.map((p) => p.market));
  let marketClosedHint = false;

  for (const market of markets) {
    const session = getMarketSession(market);
    if (!session.isRegularSession) {
      marketClosedHint = true;
    }
  }

  const currencies = new Set(baseline.map((p) => p.currency));
  for (const currency of currencies) {
    if (currency === 'MYR' || deadline.isExpired()) continue;
    try {
      await withTimeout(
        getExchangeRate(apiKey, currency, 'MYR'),
        Math.min(QUOTE_ATTEMPT_TIMEOUT_MS, deadline.remainingMs()),
      );
    } catch {
      /* 為替はフォールバック値を使用 */
    }
  }

  const quoteProbe = new QuoteProbeSession();
  const successfulPositionIds = new Set<string>();
  let positions = uniquePositions(baseline);
  const only = options?.symbolsOnly;
  if (only && only.length > 0) {
    const keys = new Set(only.map((s) => `${s.market}:${s.symbol}`));
    positions = positions.filter((p) => keys.has(`${p.market}:${p.symbol}`));
  }

  logPortfolioSymbolBatch(
    positions.map((p) => {
      const v = validatePositionSymbol(p.market, p.symbol);
      return {
        market: p.market,
        symbol: p.symbol,
        normalized: v.ok ? v.normalizedSymbol : p.symbol,
        apiSymbol: v.ok ? v.apiSymbol : undefined,
      };
    }),
  );

  for (let index = 0; index < positions.length; index++) {
    const position = positions[index];
    if (deadline.isExpired()) {
      timedOut = true;
      recordPositionFailure(
        failures,
        position,
        positionDisplayName(position),
        MARKET_DATA_MESSAGES.refreshTimeout,
        { errorKind: 'network_timeout', timedOut: true },
      );
      const { portfolio: next } = applyFailureToPortfolio(
        updated,
        position,
        await getEmergencyCachedQuote(position.market, position.symbol),
      );
      updated = next;
      continue;
    }

    if (quoteProbe.shouldAbort()) {
      const abortErr = quoteProbe.getAbortError();
      recordPositionFailure(failures, position, positionDisplayName(position), abortErr.message, {
        errorKind: abortErr.kind,
      });
      const { portfolio: next } = applyFailureToPortfolio(
        updated,
        position,
        await getEmergencyCachedQuote(position.market, position.symbol),
      );
      updated = next;
      continue;
    }

    const name = positionDisplayName(position);
    const validation = validatePositionSymbol(position.market, position.symbol);

    if (!validation.ok) {
      recordInvalidSymbolSkip();
      recordPositionFailure(failures, position, name, validation.reason);
      updated = updated.map((p) =>
        p.symbol === position.symbol && p.market === position.market ? applyApiQuoteFailure(p) : p,
      );
      continue;
    }

    const apiSymbol = validation.apiSymbol;
    const normalizedSymbol = validation.normalizedSymbol;
    const normalizedYahooSymbol = normalizeYahooSymbol(
      position.symbol,
      position.market,
    );
    const sentSymbol = normalizedYahooSymbol;
    updated = markPositionsPending(updated, position.market, position.symbol);

    const fetchResult = await fetchOnePositionQuoteWithRetry(
      apiKey,
      position,
      apiSymbol,
      sentSymbol,
      normalizedSymbol,
      quoteProbe,
      deadline,
      onProgress,
    );

    if (fetchResult.ok) {
      const normalizedPrice = normalizeQuotePrice(fetchResult.price);
      if (normalizedPrice == null) {
        recordPositionFailure(failures, position, name, MARKET_DATA_MESSAGES.priceUnavailable, {
          rawMessage: `invalid normalized price: ${String(fetchResult.price)}`,
        });
        const { portfolio: next } = applyFailureToPortfolio(
          updated,
          position,
          await getEmergencyCachedQuote(position.market, position.symbol),
        );
        updated = next;
        continue;
      }

      lastPriceProvider = fetchResult.provider;
      const now = new Date().toISOString();
      await saveCachedQuote(
        {
          market: position.market,
          symbol: position.symbol,
          price: normalizedPrice,
          currency: position.currency,
          fetchedAt: now,
          datetime: fetchResult.datetime,
          lastSuccessfulFetchAt: now,
          quoteAgeMs: 0,
          quoteAgeSeconds: 0,
          isStale: false,
        },
        { successful: true },
      );
      const companyName = mergeCompanyName(
        position.symbol,
        position.market,
        fetchResult.companyName,
        position.companyName,
      );
      const nextState = applyApiQuoteSuccess(
        position,
        normalizedPrice,
        now,
        fetchResult.provider,
        companyName,
      );
      if (!nextState) {
        logMarketData('[portfolio-refresh] reject after live quote', {
          symbol: position.symbol,
          price: fetchResult.price,
        });
        recordPositionFailure(failures, position, name, MARKET_DATA_MESSAGES.priceUnavailable);
        const { portfolio: next } = applyFailureToPortfolio(
          updated,
          position,
          await getEmergencyCachedQuote(position.market, position.symbol),
        );
        updated = next;
        continue;
      }
      successfulPositionIds.add(position.id);
      updated = updated.map((p) => (p.id === position.id ? nextState : p));
      updatedCount += 1;
      logMarketDataSuccess(
        '[portfolio-refresh] ok',
        `${position.symbol} ${normalizedPrice} via ${fetchResult.provider}`,
      );
      continue;
    }

    const err = fetchResult.err;
    if (err instanceof MarketDataStaleRequestError) {
      const cached = await getEmergencyCachedQuote(position.market, position.symbol);
      const { portfolio: next, usedCache } = applyFailureToPortfolio(updated, position, cached);
      updated = next;
      if (usedCache) updatedCount += 1;
      recordPositionFailure(
        failures,
        position,
        name,
        'リクエストがキャンセルされました（再試行してください）',
        { usedCache },
      );
      continue;
    }

    const mdErr =
      err instanceof MarketDataError ? err : createMarketDataErrorFromUnknown(err);
    if (mdErr.kind === 'network_timeout' && deadline.isExpired()) {
      timedOut = true;
    }

    const reason = failureReasonFromError(mdErr, position.market);
    const errorKind = mdErr.kind;

    if (errorKind === 'market_closed') {
      marketClosedHint = true;
    }
    if (errorKind === 'api_key') {
      resetStuckMarketDataQueue();
    }

    const savedOnPosition = preserveHoldingCurrentPrice(position);
    const usedSavedPrice = fetchResult.usedSavedPrice === true && savedOnPosition > 0;
    const cached = usedSavedPrice
      ? null
      : await getEmergencyCachedQuote(position.market, position.symbol);
    const { portfolio: next, usedCache } = applyFailureToPortfolio(updated, position, cached);
    updated = next;
    if (usedCache) updatedCount += 1;

    const failureProvider = mdErr.lastProvider ?? 'yahoo_finance';
    const providerAttempts = fetchResult.providerAttempts;
    const failureReason = usedSavedPrice
      ? MARKET_DATA_MESSAGES.offlineBanner
      : providerAttempts?.map((a) => formatProviderAttemptLine(a.provider, a.shortLabel)).join('\n') ||
        reason;

    if (!usedSavedPrice) {
      logQuoteFetchFailure({
        provider: failureProvider,
        ticker: position.symbol,
        normalizedSymbol: mdErr.normalizedSymbol ?? normalizedYahooSymbol,
        market: position.market,
        requestUrl: mdErr.requestUrl,
        httpStatus: mdErr.httpStatus,
        errorKind,
        message: failureReason,
        rawMessage: mdErr.rawMessage,
        responseBody: mdErr.responseBody,
        attempt: `portfolio:${position.id}`,
      });
    }

    recordPositionFailure(failures, position, name, failureReason, {
      errorKind,
      provider: failureProvider,
      httpStatus: mdErr.httpStatus,
      timedOut: errorKind === 'network_timeout',
      rateLimited: errorKind === 'rate_limit',
      rawMessage: mdErr.rawMessage,
      originalSymbol: position.symbol,
      normalizedYahooSymbol,
      sentSymbol: mdErr.normalizedSymbol ?? normalizedYahooSymbol,
      usedCache: usedCache || usedSavedPrice,
      usedSavedPrice,
      lastSavedPrice: savedOnPosition,
      providerAttempts,
    });

    if (index < positions.length - 1 && !deadline.isExpired()) {
      await delayMs(PORTFOLIO_SYMBOL_FETCH_DELAY_MS);
    }
  }

  if (timedOut) {
    resetStuckMarketDataQueue();
  }

  logQuoteProviderSuccessRates();

  const sanitized = sanitizePortfolio(updated).map((p) =>
    p.priceFetchStatus === 'pending' && !successfulPositionIds.has(p.id)
      ? applyApiQuoteFailure(p)
      : p,
  );
  const rolled = rollbackPortfolioSync(baseline, sanitized);
  const safePortfolio = rejectEmptyPortfolioReplace(baseline, rolled);
  if (countActiveHoldings(safePortfolio) > 0) {
    await saveHealthyPortfolioLists(safePortfolio);
  }

  const firstFailureDetail =
    failures.find((f) => f.rawMessage?.trim() || f.reason)?.rawMessage?.trim() ||
    failures[0]?.reason;
  const allFailuresHaveFallback =
    failures.length > 0 && failures.every((f) => failureHasDisplayablePrice(f));
  const baseResult = finalizePriceSyncResult({
    ok: failures.length < baseline.length && updatedCount > 0,
    updatedCount,
    failures,
    marketClosedHint,
    timedOut,
    lastPriceProvider,
  });
  const globalError =
    baseResult.totalFailure && baseResult.failedCount > 0
      ? timedOut
        ? firstFailureDetail ?? MARKET_DATA_MESSAGES.refreshTimeout
        : !allFailuresHaveFallback
          ? failures.some((f) => f.errorKind === 'api_key')
            ? MARKET_DATA_MESSAGES.apiKeyInvalid
            : firstFailureDetail ?? `価格取得に失敗: ${baseResult.failedCount}件`
          : undefined
      : undefined;

  return {
    portfolio: safePortfolio,
    result: { ...baseResult, error: globalError },
  };
}

export function getActivePortfolio(state: AppState): PortfolioPosition[] {
  const list = state.appMode === 'practice' ? state.practice.portfolio : state.portfolio;
  return sanitizePortfolio(list).filter((p) => safeShares(p.shares, 0) > 0);
}

/** マージ後に保有件数が減っていたら以前のリストを優先（API失敗で消えない） */
export function ensurePortfolioIntegrity(
  before: PortfolioPosition[],
  after: PortfolioPosition[],
): PortfolioPosition[] {
  const beforeActive = sanitizePortfolio(before).filter((p) => safeShares(p.shares, 0) > 0);
  const afterActive = sanitizePortfolio(after).filter((p) => safeShares(p.shares, 0) > 0);

  if (afterActive.length < beforeActive.length) {
    if (isDev) {
      console.log('[portfolio-merge] integrity guard — restored previous holdings', {
        before: beforeActive.length,
        after: afterActive.length,
      });
    }
    return beforeActive;
  }

  return afterActive;
}

/** 価格同期結果を現在の保有にマージ（買付直後のレースでも消えない） */
export function mergePortfolioPriceUpdates(
  current: PortfolioPosition[],
  synced: PortfolioPosition[],
): PortfolioPosition[] {
  const safeCurrent = sanitizePortfolio(current);
  const priceByKey = new Map(
    sanitizePortfolio(synced).map((p) => [`${p.market}:${p.symbol}`, p] as const),
  );

  const merged = safeCurrent
    .map((p) => {
      if (safeShares(p.shares, 0) <= 0) return null;

      const updated = priceByKey.get(`${p.market}:${p.symbol}`);
      if (!updated) return p;

      if (updated.priceFetchStatus === 'ok') {
        const nextPrice = normalizeQuotePrice(updated.currentPrice);
        if (nextPrice == null) return p;
        const fetchedAt = updated.currentPriceUpdatedAt ?? new Date().toISOString();
        return (
          applyApiQuoteSuccess(
            p,
            nextPrice,
            fetchedAt,
            updated.lastQuoteProvider,
            updated.companyName ?? p.companyName,
          ) ?? p
        );
      }

      if (updated.priceFetchStatus === 'pending') {
        return applyApiQuoteFailure({
          ...p,
          currentPrice: preserveHoldingCurrentPrice(p, updated),
        });
      }

      return applyApiQuoteFailure({
        ...p,
        currentPrice: preserveHoldingCurrentPrice(p, updated),
      });
    })
    .filter((p): p is PortfolioPosition => p != null);

  return ensurePortfolioIntegrity(safeCurrent, merged);
}

/** @internal テスト用 — 更新中シンボル一覧 */
export function listRefreshingSymbols(portfolio: PortfolioPosition[]): string[] {
  return portfolio.filter((p) => p.priceFetchStatus === 'pending').map(positionKey);
}
