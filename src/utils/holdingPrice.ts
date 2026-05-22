import type { HoldingDetail, PortfolioPosition } from '../types';
import { MARKET_DATA_MESSAGES, STALE_QUOTE_MAX_AGE_MS } from '../constants/marketData';
import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import { normalizeYahooSymbol } from './normalizeYahooSymbol';
import { formatIsoDateTimeJa } from './formatDateTimeJa';
import { isValidQuotePrice, normalizeQuotePrice, safePrice, safeShares } from './safeNumeric';

export type HoldingPriceSource = 'api_live' | 'saved' | 'manual' | 'average_buy';

/** 保有銘柄画面で使う統一価格解決結果 */
export type ResolvedHoldingPrice = {
  /** 表示・評価額・損切り/利確参考に使う最終価格 */
  price: number;
  source: HoldingPriceSource;
  latestApiPrice?: number;
  savedLastPrice?: number;
  manualPrice?: number;
  averageBuyPrice: number;
  lastSavedPrice?: number;
  /** API 成功時に確定した価格 */
  lastValidPrice?: number;
  priceStatusLabel?: string;
  priceStaleWarning: boolean;
  priceStaleByAge: boolean;
  priceFromCache: boolean;
  isStale: boolean;
  showStaleBadge: boolean;
};

/** 有効な価格を null/undefined/NaN で上書きしない（永続化・同期用） */
export function preserveHoldingCurrentPrice(
  previous: PortfolioPosition,
  patch?: Partial<PortfolioPosition>,
): number {
  const avg = safePrice(previous.averageBuyPrice, 0, 0);
  const candidates = [patch?.currentPrice, previous.currentPrice, previous.averageBuyPrice];
  for (const raw of candidates) {
    const normalized = normalizeQuotePrice(raw);
    if (normalized != null) return normalized;
    const n = safePrice(raw, 0, 0);
    if (n > 0) return n;
  }
  return avg > 0 ? avg : safePrice(previous.currentPrice, avg, 0);
}

function isQuoteStaleByAge(position: PortfolioPosition): boolean {
  if (position.isStale === true) return true;
  if (position.quoteAgeMs != null && position.quoteAgeMs > STALE_QUOTE_MAX_AGE_MS) return true;
  const ts =
    position.lastSuccessfulFetchAt ?? position.lastApiPriceAt ?? position.currentPriceUpdatedAt;
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() > STALE_QUOTE_MAX_AGE_MS;
}

function resolvePriceStatusLabel(
  position: PortfolioPosition,
  resolvedPrice: number,
): string | undefined {
  if (resolvedPrice <= 0) return undefined;
  if (position.priceSource === 'manual') return MARKET_DATA_MESSAGES.priceLabelManual;
  if (position.priceFromCache) return MARKET_DATA_MESSAGES.priceLabelCached;
  if (position.priceFetchStatus === 'failed' && isValidQuotePrice(position.currentPrice)) {
    return MARKET_DATA_MESSAGES.priceLabelStale;
  }
  if (isQuoteStaleByAge(position)) return MARKET_DATA_MESSAGES.priceLabelStaleAge;
  if (position.priceSource === 'api') return MARKET_DATA_MESSAGES.priceLabelAuto;
  return undefined;
}

/**
 * 保有銘柄の表示価格を1か所で解決する。
 * latestApiPrice ?? savedLastPrice ?? manualPrice ?? averageBuyPrice ?? 0
 */
export function resolveHoldingPrice(position: PortfolioPosition): ResolvedHoldingPrice {
  const averageBuyPrice = safePrice(position.averageBuyPrice, 0, 0);
  const rawCurrent = position.currentPrice;

  const normalizedCurrent = normalizeQuotePrice(rawCurrent);
  const latestApiPrice =
    position.priceFetchStatus === 'ok' && normalizedCurrent != null ? normalizedCurrent : undefined;

  const manualPrice =
    position.priceSource === 'manual' && normalizedCurrent != null ? normalizedCurrent : undefined;

  const savedLastPrice =
    position.priceSource !== 'manual' && normalizedCurrent != null && latestApiPrice == null
      ? normalizedCurrent
      : undefined;

  const price =
    latestApiPrice ??
    savedLastPrice ??
    manualPrice ??
    (averageBuyPrice > 0 ? averageBuyPrice : undefined) ??
    0;

  let source: HoldingPriceSource = 'average_buy';
  if (latestApiPrice != null) source = 'api_live';
  else if (savedLastPrice != null) source = 'saved';
  else if (manualPrice != null) source = 'manual';

  const lastSavedPrice = normalizedCurrent ?? undefined;
  const lastValidPrice =
    position.priceFetchStatus === 'ok'
      ? normalizeQuotePrice(position.lastValidPrice) ?? latestApiPrice
      : normalizeQuotePrice(position.lastValidPrice) ?? undefined;

  const fetchFailed = position.priceFetchStatus === 'failed' && position.priceSource !== 'manual';
  const staleByAge = isQuoteStaleByAge(position) && position.priceSource !== 'manual';
  const hasPrice = price > 0;
  const priceStaleWarning = (fetchFailed || staleByAge) && hasPrice;
  const isStale = (position.isStale === true || staleByAge) && hasPrice;

  return {
    price,
    source,
    latestApiPrice,
    savedLastPrice,
    manualPrice: manualPrice && manualPrice > 0 ? manualPrice : undefined,
    averageBuyPrice,
    lastSavedPrice,
    lastValidPrice,
    priceStatusLabel: resolvePriceStatusLabel(position, price) ?? holdingPriceSourceLabel(source),
    priceStaleWarning,
    priceStaleByAge: staleByAge,
    priceFromCache: position.priceFromCache === true,
    isStale,
    showStaleBadge: isStale && hasPrice,
  };
}

function positiveUnitPrice(value: unknown): number | undefined {
  return normalizeQuotePrice(value) ?? undefined;
}

/**
 * カードの「現在株価」表示用。評価額と同じソースを最優先し、
 * currentPrice 単体に依存しない。
 */
export function resolveDisplayCurrentPrice(
  holding: HoldingDetail,
  position?: PortfolioPosition,
): number {
  const resolvedPrice = position ? resolveHoldingPrice(position).price : undefined;
  const shares = safeShares(holding.shares, 0);
  const fromValuation =
    shares > 0 && Number.isFinite(holding.currentValue) && holding.currentValue > 0
      ? holding.currentValue / shares
      : undefined;

  const manualPrice =
    holding.priceSource === 'manual' ? positiveUnitPrice(holding.currentPrice) : undefined;

  const displayCurrentPrice =
    positiveUnitPrice(holding.displayPrice) ??
    (resolvedPrice != null && resolvedPrice > 0 ? resolvedPrice : undefined) ??
    positiveUnitPrice(holding.currentPrice) ??
    positiveUnitPrice(holding.lastSavedPrice) ??
    manualPrice ??
    fromValuation ??
    positiveUnitPrice(holding.averageBuyPrice) ??
    0;

  return displayCurrentPrice > 0
    ? displayCurrentPrice
    : safePrice(holding.averageBuyPrice, 0, 0);
}

/** 現在株価欄に必ず RM 等で表示できる文字列 */
export function formatDisplayCurrentPriceLabel(
  price: number,
  currencySymbol: string,
  statusSuffix?: string,
): string {
  const n = Number.isFinite(price) && price > 0 ? price : 0;
  const amount = `${currencySymbol}${n.toLocaleString('ja-JP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return statusSuffix?.trim() ? `${amount}（${statusSuffix}）` : amount;
}

export type HoldingPriceMeta = {
  priceStatusLabel: string;
  lastUpdatedLabel?: string;
  quoteProviderLabel?: string;
  normalizedYahooSymbol?: string;
  lastValidPrice?: number;
};

/** 保有カード用メタ（価格取得元・最終更新・自動/手動/保存） */
export function formatHoldingPriceMeta(
  position: PortfolioPosition,
  resolved: ResolvedHoldingPrice,
): HoldingPriceMeta {
  const lastUpdatedAt =
    position.lastSuccessfulFetchAt ?? position.lastApiPriceAt ?? position.currentPriceUpdatedAt;
  return {
    priceStatusLabel: resolved.priceStatusLabel ?? holdingPriceSourceLabel(resolved.source),
    lastUpdatedLabel: lastUpdatedAt ? formatIsoDateTimeJa(lastUpdatedAt) ?? lastUpdatedAt : undefined,
    quoteProviderLabel: position.lastQuoteProvider
      ? QUOTE_PROVIDER_LABELS[position.lastQuoteProvider]
      : undefined,
    normalizedYahooSymbol: normalizeYahooSymbol(position.symbol, position.market),
    lastValidPrice: resolved.lastValidPrice,
  };
}

export function holdingPriceSourceLabel(source: HoldingPriceSource): string {
  switch (source) {
    case 'api_live':
      return '自動';
    case 'saved':
      return '保存済み';
    case 'manual':
      return '手動';
    case 'average_buy':
      return '平均購入単価';
    default:
      return '';
  }
}
