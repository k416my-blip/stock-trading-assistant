import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { verboseLog, verboseWarn } from '../productionLogger';

export type StorageIntegrityResult = {
  checked: number;
  corrupted: string[];
  ok: boolean;
};

const CRITICAL_KEYS = [
  STORAGE_KEYS.appState,
  STORAGE_KEYS.aiPreferences,
  STORAGE_KEYS.proactiveSuggestions,
  STORAGE_KEYS.portfolioHealthySnapshot,
] as const;

export async function runStorageIntegrityCheck(): Promise<StorageIntegrityResult> {
  const corrupted: string[] = [];
  for (const key of CRITICAL_KEYS) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw == null) continue;
      JSON.parse(raw);
    } catch {
      corrupted.push(key);
      verboseWarn('[storage] corrupt', key);
    }
  }
  const result = {
    checked: CRITICAL_KEYS.length,
    corrupted,
    ok: corrupted.length === 0,
  };
  verboseLog('[storage] integrity', result.ok ? 'ok' : corrupted.join(','));
  return result;
}
