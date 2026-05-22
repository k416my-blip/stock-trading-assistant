import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMERGENCY_QUOTE_MAX_AGE_MS } from '../constants/marketData';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { Currency, Market } from '../types';
import { isValidQuotePrice, normalizeQuotePrice } from '../utils/safeNumeric';
import { computeQuoteStaleMetadata, type QuoteStaleMetadata } from './staleDataMetadata';

export interface CachedQuoteEntry extends QuoteStaleMetadata {
  market: Market;
  symbol: string;
  price: number;
  currency: Currency;
  fetchedAt: string;
  datetime?: string;
}

type QuoteCacheStore = {
  version: 1;
  quotes: Record<string, CachedQuoteEntry>;
};

let memoryCache: QuoteCacheStore | null = null;

function cacheKey(market: Market, symbol: string): string {
  return `${market}:${symbol.toUpperCase()}`;
}

function defaultStore(): QuoteCacheStore {
  return { version: 1, quotes: {} };
}

export async function loadQuoteCache(): Promise<QuoteCacheStore> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.quoteCache);
    if (!raw) {
      memoryCache = defaultStore();
      return memoryCache;
    }
    const parsed = JSON.parse(raw) as QuoteCacheStore;
    if (parsed.version !== 1 || !parsed.quotes) {
      memoryCache = defaultStore();
      return memoryCache;
    }
    memoryCache = parsed;
    return parsed;
  } catch {
    memoryCache = defaultStore();
    return memoryCache;
  }
}

async function persistQuoteCache(store: QuoteCacheStore): Promise<void> {
  memoryCache = store;
  await AsyncStorage.setItem(STORAGE_KEYS.quoteCache, JSON.stringify(store));
}

export async function saveCachedQuote(
  entry: CachedQuoteEntry,
  options?: { successful?: boolean },
): Promise<void> {
  const normalizedPrice = normalizeQuotePrice(entry.price);
  if (normalizedPrice == null) return;
  const store = await loadQuoteCache();
  const key = cacheKey(entry.market, entry.symbol);
  const prev = store.quotes[key];
  const fetchedAt = entry.fetchedAt || new Date().toISOString();
  const lastSuccessfulFetchAt =
    options?.successful !== false
      ? fetchedAt
      : entry.lastSuccessfulFetchAt ?? prev?.lastSuccessfulFetchAt;
  const stale = computeQuoteStaleMetadata(fetchedAt, lastSuccessfulFetchAt);

  store.quotes[key] = {
    ...entry,
    price: normalizedPrice,
    symbol: entry.symbol.toUpperCase(),
    fetchedAt,
    lastSuccessfulFetchAt: stale.lastSuccessfulFetchAt,
    quoteAgeMs: stale.quoteAgeMs,
    quoteAgeSeconds: stale.quoteAgeSeconds,
    isStale: stale.isStale,
  };
  await persistQuoteCache(store);
}

export async function getCachedQuote(
  market: Market,
  symbol: string,
  maxAgeMs = EMERGENCY_QUOTE_MAX_AGE_MS,
): Promise<CachedQuoteEntry | null> {
  const store = await loadQuoteCache();
  const row = store.quotes[cacheKey(market, symbol)];
  const normalizedPrice = row ? normalizeQuotePrice(row.price) : null;
  if (!row || normalizedPrice == null) return null;
  const stale = computeQuoteStaleMetadata(row.fetchedAt, row.lastSuccessfulFetchAt, maxAgeMs);
  if (stale.quoteAgeMs > maxAgeMs) return null;
  return {
    ...row,
    price: normalizedPrice,
    lastSuccessfulFetchAt: stale.lastSuccessfulFetchAt,
    quoteAgeMs: stale.quoteAgeMs,
    quoteAgeSeconds: stale.quoteAgeSeconds,
    isStale: stale.isStale,
  };
}

/** API失敗時の緊急フォールバック（古いキャッシュでも可） */
export async function getEmergencyCachedQuote(
  market: Market,
  symbol: string,
): Promise<CachedQuoteEntry | null> {
  return getCachedQuote(market, symbol, EMERGENCY_QUOTE_MAX_AGE_MS);
}

export async function hydrateQuoteCache(): Promise<void> {
  await loadQuoteCache();
}
