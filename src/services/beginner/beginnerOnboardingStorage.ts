import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';

export async function loadBeginnerOnboardingSeen(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.beginnerOnboardingSeen);
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export async function markBeginnerOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.beginnerOnboardingSeen, '1');
}

export async function clearBeginnerOnboardingSeen(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.beginnerOnboardingSeen);
}
