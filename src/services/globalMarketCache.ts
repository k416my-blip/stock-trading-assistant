import { GLOBAL_MARKET_CACHE_TTL_MS } from '../constants/globalMarket';
import type { YahooInstrumentSnapshot } from './globalMarketQuoteService';

type CacheEntry = {
  fetchedAt: number;
  snapshots: Record<string, YahooInstrumentSnapshot>;
};

let cache: CacheEntry | null = null;

export function getCachedGlobalMarketSnapshots(): Record<string, YahooInstrumentSnapshot> | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > GLOBAL_MARKET_CACHE_TTL_MS) {
    cache = null;
    return null;
  }
  return cache.snapshots;
}

export function setCachedGlobalMarketSnapshots(snapshots: Record<string, YahooInstrumentSnapshot>): void {
  cache = { fetchedAt: Date.now(), snapshots };
}

export function clearGlobalMarketCacheForTest(): void {
  cache = null;
}
