import { getMarketSession } from './marketSession';
import { toUserFriendlyPriceError } from './marketDataErrors';
import { validatePositionSymbol } from './marketDataValidation';
import { QuoteProbeSession } from './marketDataProbe';
import { recordInvalidSymbolSkip } from './marketDataDiagnostics';
import {
  getQuoteForMarket,
  getExchangeRate,
  MarketDataError,
  MarketDataStaleRequestError,
} from './marketDataService';
import { getEmergencyCachedQuote, saveCachedQuote } from './quoteCache';
import {
  countActiveHoldings,
  rejectEmptyPortfolioReplace,
} from './portfolioPersistenceGuard';
import { rollbackPortfolioSync, saveHealthyPortfolioLists } from './portfolioSnapshot';
import { computeQuoteStaleMetadata } from './staleDataMetadata';
import { positionDisplayName } from './sellAllHoldings';
import type { AppState, PortfolioPosition } from '../types';
import type { PriceSyncFailure, PriceSyncResult } from '../types/marketData';
import { isDev } from '../utils/isDev';
import { isValidQuotePrice, safePrice, safeShares } from '../utils/safeNumeric';

function uniquePositions(portfolio: PortfolioPosition[]): PortfolioPosition[] {
  const seen = new Set<string>();
  return portfolio.filter((p) => {
    const key = `${p.market}:${p.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** ポジションの数値フィールドを安全化（NaN を除去） */
export function sanitizePortfolioPosition(raw: PortfolioPosition): PortfolioPosition {
  const shares = safeShares(raw.shares, 0);
  const averageBuyPrice = safePrice(raw.averageBuyPrice, 0, 0);
  const currentPrice = safePrice(raw.currentPrice, averageBuyPrice, 0);

  return {
    ...raw,
    shares,
    averageBuyPrice,
    currentPrice,
  };
}

export function sanitizePortfolio(portfolio: PortfolioPosition[]): PortfolioPosition[] {
  return portfolio.map(sanitizePortfolioPosition);
}

function withStaleFields(
  position: PortfolioPosition,
  fetchedAt: string,
  lastSuccessfulFetchAt?: string,
): PortfolioPosition {
  const stale = computeQuoteStaleMetadata(fetchedAt, lastSuccessfulFetchAt ?? fetchedAt);
  return {
    ...position,
    lastSuccessfulFetchAt: stale.lastSuccessfulFetchAt,
    quoteAgeMs: stale.quoteAgeMs,
    quoteAgeSeconds: stale.quoteAgeSeconds,
    isStale: stale.isStale,
  };
}

function applyFailedFetchState(position: PortfolioPosition): PortfolioPosition {
  const base = sanitizePortfolioPosition(position);
  const anchor = base.lastSuccessfulFetchAt ?? base.lastApiPriceAt ?? base.currentPriceUpdatedAt;
  return withStaleFields(
    {
      ...base,
      priceFetchStatus: 'failed',
      priceFromCache: false,
      isStale: true,
    },
    anchor ?? new Date().toISOString(),
    anchor,
  );
}

function applyCachedQuoteState(
  position: PortfolioPosition,
  cached: {
    price: number;
    fetchedAt: string;
    lastSuccessfulFetchAt?: string;
    isStale?: boolean;
  },
): PortfolioPosition {
  const base = sanitizePortfolioPosition(position);
  const nextPrice = safePrice(cached.price, base.currentPrice, base.averageBuyPrice);
  return withStaleFields(
    {
      ...base,
      currentPrice: nextPrice,
      currentPriceUpdatedAt: cached.fetchedAt,
      priceSource: 'api',
      priceFetchStatus: 'ok',
      lastApiPriceAt: cached.fetchedAt,
      priceFromCache: true,
      isStale: cached.isStale ?? true,
    },
    cached.fetchedAt,
    cached.lastSuccessfulFetchAt,
  );
}

function applySuccessfulFetchState(
  position: PortfolioPosition,
  apiPrice: number,
  now: string,
): PortfolioPosition | null {
  const base = sanitizePortfolioPosition(position);
  if (!isValidQuotePrice(apiPrice)) {
    return null;
  }
  const nextPrice = safePrice(apiPrice, base.currentPrice, base.averageBuyPrice);
  if (!isValidQuotePrice(nextPrice)) {
    return null;
  }

  return withStaleFields(
    {
      ...base,
      currentPrice: nextPrice,
      currentPriceUpdatedAt: now,
      priceSource: 'api',
      priceFetchStatus: 'ok',
      lastApiPriceAt: now,
      priceFromCache: false,
      isStale: false,
    },
    now,
    now,
  );
}

export async function syncPortfolioPrices(
  apiKey: string,
  portfolio: PortfolioPosition[],
): Promise<{
  portfolio: PortfolioPosition[];
  result: PriceSyncResult;
}> {
  const baseline = sanitizePortfolio(portfolio);
  if (countActiveHoldings(baseline) > 0) {
    await saveHealthyPortfolioLists(baseline);
  }

  if (!apiKey.trim()) {
    return {
      portfolio: baseline,
      result: {
        ok: false,
        updatedCount: 0,
        failures: [],
        marketClosedHint: false,
        error: 'APIキーが未設定です',
      },
    };
  }

  if (baseline.length === 0) {
    return {
      portfolio: baseline,
      result: { ok: true, updatedCount: 0, failures: [], marketClosedHint: false },
    };
  }

  const failures: PriceSyncFailure[] = [];
  let updated = [...baseline];
  let updatedCount = 0;
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
    if (currency === 'MYR') continue;
    try {
      await getExchangeRate(apiKey, currency, 'MYR');
    } catch {
      /* 為替はフォールバック値を使用 */
    }
  }

  const quoteProbe = new QuoteProbeSession();

  for (const position of uniquePositions(baseline)) {
    if (quoteProbe.shouldAbort()) {
      const abortErr = quoteProbe.getAbortError();
      failures.push({
        positionId: position.id,
        symbol: position.symbol,
        name: positionDisplayName(position),
        market: position.market,
        reason: abortErr.message,
        errorKind: abortErr.kind,
      });
      updated = updated.map((p) =>
        p.symbol === position.symbol && p.market === position.market
          ? applyFailedFetchState(p)
          : p,
      );
      continue;
    }
    const name = positionDisplayName(position);
    const validation = validatePositionSymbol(position.market, position.symbol);

    if (!validation.ok) {
      recordInvalidSymbolSkip();
      if (isDev) {
        console.log('[portfolio-price] skip invalid symbol', position.symbol, position.market);
      }
      failures.push({
        positionId: position.id,
        symbol: position.symbol,
        name,
        market: position.market,
        reason: validation.reason,
      });
      updated = updated.map((p) =>
        p.symbol === position.symbol && p.market === position.market
          ? applyFailedFetchState(p)
          : p,
      );
      continue;
    }

    const apiSymbol = validation.normalizedSymbol;

    try {
      const quote = await getQuoteForMarket(
        apiKey,
        position.market,
        apiSymbol,
        position.currency,
        { probe: quoteProbe },
      );
      const now = new Date().toISOString();
      await saveCachedQuote(
        {
          market: position.market,
          symbol: position.symbol,
          price: quote.price,
          currency: position.currency,
          fetchedAt: now,
          datetime: quote.datetime,
          lastSuccessfulFetchAt: now,
          quoteAgeMs: 0,
          quoteAgeSeconds: 0,
          isStale: false,
        },
        { successful: true },
      );
      const nextState = applySuccessfulFetchState(position, quote.price, now);

      if (!nextState) {
        failures.push({
          positionId: position.id,
          symbol: position.symbol,
          name,
          market: position.market,
          reason: '株価を取得できませんでした',
        });
        updated = updated.map((p) =>
          p.symbol === position.symbol && p.market === position.market
            ? applyFailedFetchState(p)
            : p,
        );
        continue;
      }

      updated = updated.map((p) =>
        p.symbol === position.symbol && p.market === position.market ? nextState : p,
      );
      updatedCount += 1;
    } catch (err) {
      if (err instanceof MarketDataStaleRequestError) {
        continue;
      }
      const errorKind =
        err instanceof MarketDataError ? err.kind : 'unknown';
      const reason = toUserFriendlyPriceError(
        err instanceof MarketDataError ? err : '取得に失敗しました',
      );
      if (errorKind === 'market_closed') {
        marketClosedHint = true;
      }
      if (isDev) {
        console.log('[portfolio-price] fetch failed (debug)', {
          symbol: position.symbol,
          apiSymbol,
          market: position.market,
          errorKind,
          raw: err instanceof MarketDataError ? err.rawMessage : String(err),
        });
      }
      failures.push({
        positionId: position.id,
        symbol: position.symbol,
        name,
        market: position.market,
        reason,
        errorKind,
      });
      const cached = await getEmergencyCachedQuote(position.market, position.symbol);
      updated = updated.map((p) => {
        if (p.symbol !== position.symbol || p.market !== position.market) return p;
        if (cached) return applyCachedQuoteState(p, cached);
        return applyFailedFetchState(p);
      });
      if (cached) {
        updatedCount += 1;
      }
    }
  }

  const sanitized = sanitizePortfolio(updated);
  const rolled = rollbackPortfolioSync(baseline, sanitized);
  const safePortfolio = rejectEmptyPortfolioReplace(baseline, rolled);
  if (countActiveHoldings(safePortfolio) > 0) {
    await saveHealthyPortfolioLists(safePortfolio);
  }

  return {
    portfolio: safePortfolio,
    result: {
      ok: failures.length < baseline.length,
      updatedCount,
      failures,
      marketClosedHint,
      error:
        updatedCount === 0 && failures.length > 0
          ? `株価取得に失敗: ${failures.length}件`
          : undefined,
    },
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
        const nextPrice = safePrice(updated.currentPrice, p.currentPrice, p.averageBuyPrice);
        if (nextPrice <= 0) {
          return applyFailedFetchState(p);
        }
        const fetchedAt = updated.currentPriceUpdatedAt ?? new Date().toISOString();
        const lastOk = updated.lastSuccessfulFetchAt ?? updated.lastApiPriceAt ?? fetchedAt;
        return withStaleFields(
          sanitizePortfolioPosition({
            ...p,
            currentPrice: nextPrice,
            currentPriceUpdatedAt: fetchedAt,
            priceSource: 'api',
            priceFetchStatus: 'ok',
            lastApiPriceAt: updated.lastApiPriceAt ?? fetchedAt,
            priceFromCache: updated.priceFromCache ?? false,
          }),
          fetchedAt,
          lastOk,
        );
      }

      return applyFailedFetchState(p);
    })
    .filter((p): p is PortfolioPosition => p != null);

  return ensurePortfolioIntegrity(safeCurrent, merged);
}
