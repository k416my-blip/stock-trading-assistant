import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { MarketIntelligenceSnapshot } from '../types/marketIntelligence';

export async function loadMarketIntelligenceSnapshot(): Promise<MarketIntelligenceSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.marketIntelligenceSnapshot);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MarketIntelligenceSnapshot;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveMarketIntelligenceSnapshot(snapshot: MarketIntelligenceSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.marketIntelligenceSnapshot, JSON.stringify(snapshot));
}

export async function clearMarketIntelligenceSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.marketIntelligenceSnapshot);
}
