/**
 * 保有銘柄の価格解決・symbol 正規化・API 成功/失敗の単一入口。
 * Never overwrite valid holding data with null/undefined.
 */
import type { Market, PortfolioPosition } from '../types';
import type { PriceSyncFailure, PriceSyncResult } from '../types/marketData';
import type { QuoteProviderId } from '../types/quoteProvider';
import { validatePositionSymbol } from './marketDataValidation';
import { computeQuoteStaleMetadata } from './staleDataMetadata';
import {
  formatDisplayCurrentPriceLabel,
  formatHoldingPriceMeta,
  holdingPriceSourceLabel,
  preserveHoldingCurrentPrice,
  resolveDisplayCurrentPrice,
  resolveHoldingPrice,
  type HoldingPriceMeta,
  type HoldingPriceSource,
  type ResolvedHoldingPrice,
} from '../utils/holdingPrice';
import { normalizeQuotePrice, safePrice, safeShares } from '../utils/safeNumeric';
import { normalizeYahooSymbol } from '../utils/normalizeYahooSymbol';

export {
  preserveHoldingCurrentPrice,
  resolveHoldingPrice,
  resolveDisplayCurrentPrice,
  formatDisplayCurrentPriceLabel,
  holdingPriceSourceLabel,
  formatHoldingPriceMeta,
  type HoldingPriceSource,
  type ResolvedHoldingPrice,
  type HoldingPriceMeta,
};

export {
  attachPriceSyncUxState,
  derivePriceSyncUxCounts,
  emptyPriceSyncResult,
  failureHasDisplayablePrice,
  formatPartialPriceRefreshBanner,
  formatPriceRefreshErrorDialogMessage,
  isPriceRefreshFullSuccess,
  shouldShowPriceRefreshErrorDialog,
  shouldShowPriceRefreshPartialBanner,
  totalFailureAlertTitle,
} from './priceSyncNotifications';

export type ResolvedHoldingSymbols =
  | {
      ok: true;
      normalizedSymbol: string;
      apiSymbol: string;
      yahooSymbol: string;
    }
  | { ok: false; reason: string };

/** 保有銘柄の API 用 symbol（検証 + Yahoo 正規化） */
export function resolveHoldingQuoteSymbols(market: Market, symbol: string): ResolvedHoldingSymbols {
  const validation = validatePositionSymbol(market, symbol);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }
  return {
    ok: true,
    normalizedSymbol: validation.normalizedSymbol,
    apiSymbol: validation.apiSymbol,
    yahooSymbol: normalizeYahooSymbol(validation.normalizedSymbol, market),
  };
}

export function sanitizeHoldingPosition(raw: PortfolioPosition): PortfolioPosition {
  const shares = safeShares(raw.shares, 0);
  const averageBuyPrice = safePrice(raw.averageBuyPrice, 0, 0);
  const currentPrice = preserveHoldingCurrentPrice(
    { ...raw, shares, averageBuyPrice, currentPrice: raw.currentPrice },
  );
  return { ...raw, shares, averageBuyPrice, currentPrice };
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

/** patch 適用時も currentPrice を null/undefined で上書きしない */
export function patchHoldingKeepingPrice(
  previous: PortfolioPosition,
  patch: Partial<PortfolioPosition>,
): PortfolioPosition {
  const base = sanitizeHoldingPosition({ ...previous, ...patch });
  return {
    ...base,
    currentPrice: preserveHoldingCurrentPrice(previous, patch),
    lastValidPrice:
      patch.lastValidPrice !== undefined
        ? normalizeQuotePrice(patch.lastValidPrice) ?? previous.lastValidPrice
        : previous.lastValidPrice,
  };
}

/** API 成功時のみ lastValidPrice / lastApiPriceAt を更新 */
export function applyApiQuoteSuccess(
  position: PortfolioPosition,
  apiPrice: unknown,
  fetchedAt: string,
  provider?: QuoteProviderId,
  companyName?: string | null,
): PortfolioPosition | null {
  const normalizedPrice = normalizeQuotePrice(apiPrice);
  if (normalizedPrice == null) return null;

  const base = sanitizeHoldingPosition(position);
  const nextCompany =
    companyName?.trim() || base.companyName?.trim() || undefined;
  return withStaleFields(
    {
      ...base,
      currentPrice: normalizedPrice,
      lastValidPrice: normalizedPrice,
      currentPriceUpdatedAt: fetchedAt,
      priceSource: 'api',
      priceFetchStatus: 'ok',
      lastApiPriceAt: fetchedAt,
      lastQuoteProvider: provider,
      priceFromCache: false,
      isStale: false,
      companyName: nextCompany,
    },
    fetchedAt,
    fetchedAt,
  );
}

/** API 失敗 — 有効な価格は維持（null で上書きしない） */
export function applyApiQuoteFailure(position: PortfolioPosition): PortfolioPosition {
  const base = sanitizeHoldingPosition(position);
  const currentPrice = preserveHoldingCurrentPrice(base);
  const anchor = base.lastSuccessfulFetchAt ?? base.lastApiPriceAt ?? base.currentPriceUpdatedAt;
  return withStaleFields(
    {
      ...base,
      currentPrice,
      priceFetchStatus: 'failed',
      priceFromCache: false,
      isStale: true,
    },
    anchor ?? new Date().toISOString(),
    anchor,
  );
}

export function applyApiCachedQuote(
  position: PortfolioPosition,
  cached: {
    price: number;
    fetchedAt: string;
    lastSuccessfulFetchAt?: string;
    isStale?: boolean;
  },
  provider?: QuoteProviderId,
): PortfolioPosition {
  const base = sanitizeHoldingPosition(position);
  const normalized = normalizeQuotePrice(cached.price);
  const nextPrice = normalized ?? preserveHoldingCurrentPrice(base);
  return withStaleFields(
    {
      ...base,
      currentPrice: nextPrice,
      lastValidPrice: normalized ?? base.lastValidPrice,
      currentPriceUpdatedAt: cached.fetchedAt,
      priceSource: 'api',
      priceFetchStatus: 'ok',
      lastApiPriceAt: cached.fetchedAt,
      lastQuoteProvider: provider,
      priceFromCache: true,
      isStale: cached.isStale ?? true,
    },
    cached.fetchedAt,
    cached.lastSuccessfulFetchAt,
  );
}

/** ライブ取得成功として updatedCount に加算してよいか */
export function isLiveQuoteSuccess(price: unknown): boolean {
  return normalizeQuotePrice(price) != null;
}

/** failures に載せるべきか（表示価格が残っていれば載せない） */
export function shouldRecordPriceSyncFailure(
  position: PortfolioPosition,
  failure: Pick<PriceSyncFailure, 'usedSavedPrice' | 'usedCache' | 'lastSavedPrice'>,
): boolean {
  if (failure.usedSavedPrice || failure.usedCache) return true;
  if (normalizeQuotePrice(failure.lastSavedPrice) != null) return true;
  return normalizeQuotePrice(position.lastValidPrice ?? position.currentPrice) == null;
}

export function buildPriceSyncFailure(
  position: PortfolioPosition,
  name: string,
  reason: string,
  extra?: Partial<PriceSyncFailure>,
): PriceSyncFailure {
  const saved = preserveHoldingCurrentPrice(position);
  return {
    positionId: position.id,
    symbol: position.symbol,
    name,
    market: position.market,
    reason,
    lastSavedPrice: saved > 0 ? saved : undefined,
    originalSymbol: position.symbol,
    ...extra,
  };
}

export { finalizePriceSyncResult } from './priceSyncDisplay';
