import AsyncStorage from '@react-native-async-storage/async-storage';
import { X_SYMBOL_CACHE_TTL_MS } from '../constants/xApiConservation';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { Market } from '../types';
import type { XSymbolCacheEntry } from '../types/xApi';

type CacheStore = {
  version: 1;
  entries: Record<string, XSymbolCacheEntry>;
};

function cacheKey(market: Market, symbol: string): string {
  return `${market}:${symbol.trim().toUpperCase()}`;
}

function emptyStore(): CacheStore {
  return { version: 1, entries: {} };
}

async function loadStore(): Promise<CacheStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.xApiSymbolCache);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<CacheStore>;
    return {
      version: 1,
      entries: parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: CacheStore): Promise<void> {
  const now = Date.now();
  const pruned: Record<string, XSymbolCacheEntry> = {};
  for (const [key, entry] of Object.entries(store.entries)) {
    if (Date.parse(entry.expiresAt) > now) {
      pruned[key] = entry;
    }
  }
  await AsyncStorage.setItem(
    STORAGE_KEYS.xApiSymbolCache,
    JSON.stringify({ version: 1, entries: pruned }),
  );
}

export async function getCachedXSymbolInsight(
  market: Market,
  symbol: string,
  nowMs = Date.now(),
): Promise<XSymbolCacheEntry | null> {
  const store = await loadStore();
  const entry = store.entries[cacheKey(market, symbol)];
  if (!entry) return null;
  if (Date.parse(entry.expiresAt) <= nowMs) return null;
  return { ...entry, fromCache: true };
}

export async function setCachedXSymbolInsight(
  entry: Omit<XSymbolCacheEntry, 'fromCache' | 'expiresAt'>,
  nowMs = Date.now(),
): Promise<XSymbolCacheEntry> {
  const full: XSymbolCacheEntry = {
    ...entry,
    expiresAt: new Date(nowMs + X_SYMBOL_CACHE_TTL_MS).toISOString(),
    fromCache: false,
  };
  const store = await loadStore();
  store.entries[cacheKey(entry.market, entry.symbol)] = full;
  await saveStore(store);
  return full;
}
