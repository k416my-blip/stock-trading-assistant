import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AppLanguage } from '../types/appLanguage';
import { normalizeAppLanguage } from '../types/appLanguage';

export async function loadAppLanguage(): Promise<AppLanguage | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.appLanguage);
    return normalizeAppLanguage(stored);
  } catch {
    return null;
  }
}

export async function hasSavedAppLanguage(): Promise<boolean> {
  const stored = await loadAppLanguage();
  return stored !== null;
}

export async function saveAppLanguage(language: AppLanguage): Promise<void> {
  const normalized = normalizeAppLanguage(language);
  if (!normalized) {
    throw new Error(`Unsupported app language: ${String(language)}`);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.appLanguage, normalized);
}
