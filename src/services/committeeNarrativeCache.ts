import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMITTEE_NARRATIVE_CACHE_TTL_MS } from '../constants/investmentCommitteeNarrative';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AdoptionVerdict } from '../types/investmentCharter';
import type { CommitteeReview } from '../types/investmentCommitteeNarrative';
import { normalizeSymbolKey } from './userAnalysisSymbols';

type CacheEntry = {
  narrative: CommitteeReview;
  cachedAt: string;
};

type CacheStore = {
  entries: Record<string, CacheEntry>;
};

const memoryCache = new Map<string, CacheEntry>();

export type CommitteeNarrativeCacheKeyInput = {
  symbol: string;
  lockedVerdict: AdoptionVerdict;
  recommendationScore: number;
  confidencePct: number;
};

export function buildCommitteeNarrativeCacheKey(input: CommitteeNarrativeCacheKeyInput): string {
  return (
    normalizeSymbolKey(input.symbol) +
    input.lockedVerdict +
    String(input.recommendationScore) +
    String(input.confidencePct)
  );
}

function isFresh(cachedAt: string, nowMs = Date.now()): boolean {
  const t = Date.parse(cachedAt);
  if (!Number.isFinite(t)) return false;
  return nowMs - t < COMMITTEE_NARRATIVE_CACHE_TTL_MS;
}

function emptyStore(): CacheStore {
  return { entries: {} };
}

async function loadStore(): Promise<CacheStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.committeeNarrativeCache);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as CacheStore;
    if (!parsed.entries || typeof parsed.entries !== 'object') return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: CacheStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.committeeNarrativeCache, JSON.stringify(store));
}

function pruneExpired(store: CacheStore, nowMs = Date.now()): CacheStore {
  const entries: Record<string, CacheEntry> = {};
  for (const [key, entry] of Object.entries(store.entries)) {
    if (isFresh(entry.cachedAt, nowMs)) entries[key] = entry;
  }
  return { entries };
}

export function getCommitteeNarrativeFromMemoryCache(cacheKey: string): CommitteeReview | null {
  const hit = memoryCache.get(cacheKey);
  if (!hit || !isFresh(hit.cachedAt)) {
    if (hit) memoryCache.delete(cacheKey);
    return null;
  }
  return hit.narrative;
}

export async function getCommitteeNarrativeFromPersistentCache(
  cacheKey: string,
): Promise<CommitteeReview | null> {
  const mem = getCommitteeNarrativeFromMemoryCache(cacheKey);
  if (mem) return mem;

  const store = pruneExpired(await loadStore());
  const hit = store.entries[cacheKey];
  if (!hit || !isFresh(hit.cachedAt)) {
    if (hit) {
      delete store.entries[cacheKey];
      await saveStore(store);
    }
    return null;
  }

  memoryCache.set(cacheKey, hit);
  return hit.narrative;
}

export async function setCommitteeNarrativeCache(
  cacheKey: string,
  narrative: CommitteeReview,
): Promise<void> {
  const cachedAt = new Date().toISOString();
  const entry: CacheEntry = { narrative, cachedAt };
  memoryCache.set(cacheKey, entry);

  const store = pruneExpired(await loadStore());
  store.entries[cacheKey] = entry;
  await saveStore(store);
}

/** テスト用 */
export async function clearCommitteeNarrativeCacheForTest(): Promise<void> {
  memoryCache.clear();
  await AsyncStorage.removeItem(STORAGE_KEYS.committeeNarrativeCache);
}

export function clearCommitteeNarrativeMemoryCacheForTest(): void {
  memoryCache.clear();
}
