import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';

export type BursaCacheCategory = 'profile' | 'quarterly' | 'dividend' | 'peerSnapshot' | 'shareholdings' | 'financialReport';

const TTL_MS: Record<BursaCacheCategory, number> = {
  profile: 30 * 24 * 60 * 60 * 1000,
  quarterly: 7 * 24 * 60 * 60 * 1000,
  dividend: 30 * 24 * 60 * 60 * 1000,
  peerSnapshot: 7 * 24 * 60 * 60 * 1000,
  shareholdings: 7 * 24 * 60 * 60 * 1000,
  financialReport: 7 * 24 * 60 * 60 * 1000,
};

type CacheEnvelope<T> = {
  savedAt: string;
  expiresAt: string;
  payload: T;
};

function cacheKey(category: BursaCacheCategory, stockCode: string): string {
  return `${STORAGE_KEYS.bursaDisclosureCache}:${category}:${stockCode}`;
}

export async function readBursaCache<T>(
  category: BursaCacheCategory,
  stockCode: string,
): Promise<{ payload: T; cached: true } | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(category, stockCode));
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() > Date.parse(env.expiresAt)) {
      await AsyncStorage.removeItem(cacheKey(category, stockCode));
      return null;
    }
    return { payload: env.payload, cached: true };
  } catch {
    return null;
  }
}

export async function writeBursaCache<T>(
  category: BursaCacheCategory,
  stockCode: string,
  payload: T,
): Promise<void> {
  try {
    const now = Date.now();
    const env: CacheEnvelope<T> = {
      savedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + TTL_MS[category]).toISOString(),
      payload,
    };
    await AsyncStorage.setItem(cacheKey(category, stockCode), JSON.stringify(env));
  } catch {
    // Node / test — AsyncStorage unavailable
  }
}

export function bursaCacheTtlDays(category: BursaCacheCategory): number {
  return TTL_MS[category] / (24 * 60 * 60 * 1000);
}
