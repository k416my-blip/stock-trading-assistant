/**
 * Quote / News / X キャッシュの統一TTL・鮮度チェック
 */
import { NEWS_CACHE_TTL_MS } from '../constants/aiDataDriven';
import { X_SYMBOL_CACHE_TTL_MS } from '../constants/xApiConservation';
import { UNIFIED_CACHE_TTL_MS } from '../constants/performanceCost';
import type { Market } from '../types';
import { getCachedNewsForSymbol } from './newsCacheStorage';
import { getCachedQuote } from './quoteCache';
import { getCachedXSymbolInsight } from './xApiCacheStorage';

export type UnifiedCacheKind = 'quote' | 'news' | 'x';

export function unifiedCacheTtlMs(kind: UnifiedCacheKind, quoteTtlMs?: number): number {
  switch (kind) {
    case 'quote':
      return quoteTtlMs ?? UNIFIED_CACHE_TTL_MS.quoteDefault;
    case 'news':
      return NEWS_CACHE_TTL_MS;
    case 'x':
      return X_SYMBOL_CACHE_TTL_MS;
    default:
      return UNIFIED_CACHE_TTL_MS.quoteDefault;
  }
}

export function isUnifiedCacheFresh(fetchedAtIso: string, ttlMs: number, nowMs = Date.now()): boolean {
  return nowMs - Date.parse(fetchedAtIso) < ttlMs;
}

export async function getUnifiedQuoteCache(
  market: Market,
  symbol: string,
  ttlMs = UNIFIED_CACHE_TTL_MS.quoteDefault,
) {
  const entry = await getCachedQuote(market, symbol);
  if (!entry) return null;
  if (!isUnifiedCacheFresh(entry.fetchedAt, ttlMs)) return { entry, stale: true };
  return { entry, stale: false };
}

export async function getUnifiedNewsCache(market: Market, symbol: string) {
  const entry = await getCachedNewsForSymbol(market, symbol);
  if (!entry) return null;
  const fresh = isUnifiedCacheFresh(entry.fetchedAt, NEWS_CACHE_TTL_MS);
  return { entry, stale: !fresh };
}

export async function getUnifiedXCache(market: Market, symbol: string) {
  const entry = await getCachedXSymbolInsight(market, symbol);
  if (!entry) return null;
  const fresh = isUnifiedCacheFresh(entry.fetchedAt, X_SYMBOL_CACHE_TTL_MS);
  return { entry, stale: !fresh };
}

export function unifiedCacheSummaryJa(): string {
  return `統一キャッシュ TTL: 株価 ${UNIFIED_CACHE_TTL_MS.quoteDefault / 60000}分 / ニュース ${NEWS_CACHE_TTL_MS / 60000}分 / X ${X_SYMBOL_CACHE_TTL_MS / 60000}分`;
}
