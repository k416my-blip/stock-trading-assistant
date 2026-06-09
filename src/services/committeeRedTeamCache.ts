import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMITTEE_NARRATIVE_CACHE_TTL_MS } from '../constants/investmentCommitteeNarrative';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { RedTeamReview } from '../types/investmentCommitteeNarrative';
import { buildCommitteeNarrativeCacheKey, type CommitteeNarrativeCacheKeyInput } from './committeeNarrativeCache';

type CacheEntry = {
  review: RedTeamReview;
  cachedAt: string;
};

type CacheStore = {
  entries: Record<string, CacheEntry>;
};

const memoryCache = new Map<string, CacheEntry>();

export function buildRedTeamCacheKey(input: CommitteeNarrativeCacheKeyInput): string {
  return `${buildCommitteeNarrativeCacheKey(input)}|redteam`;
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
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.committeeRedTeamCache);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as CacheStore;
    if (!parsed.entries || typeof parsed.entries !== 'object') return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: CacheStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.committeeRedTeamCache, JSON.stringify(store));
}

function pruneExpired(store: CacheStore, nowMs = Date.now()): CacheStore {
  const entries: Record<string, CacheEntry> = {};
  for (const [key, entry] of Object.entries(store.entries)) {
    if (isFresh(entry.cachedAt, nowMs)) entries[key] = entry;
  }
  return { entries };
}

export function getRedTeamFromMemoryCache(cacheKey: string): RedTeamReview | null {
  const hit = memoryCache.get(cacheKey);
  if (!hit || !isFresh(hit.cachedAt)) {
    if (hit) memoryCache.delete(cacheKey);
    return null;
  }
  return hit.review;
}

export async function getRedTeamFromPersistentCache(cacheKey: string): Promise<RedTeamReview | null> {
  const mem = getRedTeamFromMemoryCache(cacheKey);
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
  return hit.review;
}

export async function setRedTeamCache(cacheKey: string, review: RedTeamReview): Promise<void> {
  const cachedAt = new Date().toISOString();
  const entry: CacheEntry = { review, cachedAt };
  memoryCache.set(cacheKey, entry);

  const store = pruneExpired(await loadStore());
  store.entries[cacheKey] = entry;
  await saveStore(store);
}

/** テスト用 */
export async function clearRedTeamCacheForTest(): Promise<void> {
  memoryCache.clear();
  await AsyncStorage.removeItem(STORAGE_KEYS.committeeRedTeamCache);
}

export function clearRedTeamMemoryCacheForTest(): void {
  memoryCache.clear();
}
