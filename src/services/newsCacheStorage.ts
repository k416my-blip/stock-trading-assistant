import AsyncStorage from '@react-native-async-storage/async-storage';
import { NEWS_CACHE_TTL_MS } from '../constants/aiDataDriven';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { Market } from '../types';
import type { ConciergeNewsHeadlineEvidence } from '../types/conciergeEvidence';

export type NewsCacheEntry = {
  symbol: string;
  market: Market;
  headlines: ConciergeNewsHeadlineEvidence[];
  newsSummaryJa: string;
  newsSource: string;
  fetchedAt: string;
  expiresAt: string;
};

type NewsCacheStore = {
  version: 1;
  entries: Record<string, NewsCacheEntry>;
};

function cacheKey(market: Market, symbol: string): string {
  return `${market}:${symbol.trim().toUpperCase()}`;
}

function emptyStore(): NewsCacheStore {
  return { version: 1, entries: {} };
}

async function loadStore(): Promise<NewsCacheStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.newsSymbolCache);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<NewsCacheStore>;
    return {
      version: 1,
      entries: parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: NewsCacheStore): Promise<void> {
  const now = Date.now();
  const pruned: Record<string, NewsCacheEntry> = {};
  for (const [key, entry] of Object.entries(store.entries)) {
    if (Date.parse(entry.expiresAt) > now) {
      pruned[key] = entry;
    }
  }
  await AsyncStorage.setItem(
    STORAGE_KEYS.newsSymbolCache,
    JSON.stringify({ version: 1, entries: pruned }),
  );
}

export async function getCachedNewsForSymbol(
  market: Market,
  symbol: string,
  nowMs = Date.now(),
): Promise<NewsCacheEntry | null> {
  const store = await loadStore();
  const entry = store.entries[cacheKey(market, symbol)];
  if (!entry) return null;
  if (Date.parse(entry.expiresAt) <= nowMs) return null;
  return entry;
}

export async function setCachedNewsForSymbol(
  entry: Omit<NewsCacheEntry, 'expiresAt' | 'fetchedAt'>,
  nowMs = Date.now(),
): Promise<NewsCacheEntry> {
  const full: NewsCacheEntry = {
    ...entry,
    fetchedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + NEWS_CACHE_TTL_MS).toISOString(),
  };
  const store = await loadStore();
  store.entries[cacheKey(entry.market, entry.symbol)] = full;
  await saveStore(store);
  return full;
}
