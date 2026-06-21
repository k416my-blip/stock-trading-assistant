import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AppLanguage } from '../types/appLanguage';
import { isAppLanguage } from '../types/appLanguage';

export async function loadAppLanguage(): Promise<AppLanguage | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.appLanguage);
    if (isAppLanguage(stored)) {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

export async function hasSavedAppLanguage(): Promise<boolean> {
  const stored = await loadAppLanguage();
  return stored !== null;
}

export async function saveAppLanguage(language: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.appLanguage, language);
}
