import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { Market } from '../types';
import type { AdjustedOHLCVBar } from '../types/quantValidation';

export type CachedOHLCVEntry = {
  symbol: string;
  market: Market;
  bars: AdjustedOHLCVBar[];
  fetchedAt: string;
  adjustMode: 'all' | 'none';
};

type CacheFile = Record<string, CachedOHLCVEntry>;

export function ohlcvCacheKey(symbol: string, market: Market): string {
  return `${market}:${symbol}`;
}

export async function loadOHLCVCache(): Promise<CacheFile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ohlcvCache);
    if (!raw) return {};
    return JSON.parse(raw) as CacheFile;
  } catch {
    return {};
  }
}

export async function saveOHLCVCache(cache: CacheFile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ohlcvCache, JSON.stringify(cache));
}

export async function clearOHLCVCache(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.ohlcvCache);
}

export async function getCachedOHLCVEntry(
  market: Market,
  symbol: string,
): Promise<CachedOHLCVEntry | null> {
  const cache = await loadOHLCVCache();
  return cache[ohlcvCacheKey(symbol, market)] ?? null;
}

export async function setCachedOHLCVEntry(entry: CachedOHLCVEntry): Promise<void> {
  const cache = await loadOHLCVCache();
  cache[ohlcvCacheKey(entry.symbol, entry.market)] = entry;
  await saveOHLCVCache(cache);
}
