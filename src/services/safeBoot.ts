import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

const BOOT_ATTEMPTS_KEY = '@sta/safe_boot_attempts_v1';
const MAX_RECOVERY_ATTEMPTS = 3;

export type BootMode = 'normal' | 'safe';

export async function readRecoveryAttemptCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(BOOT_ATTEMPTS_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export async function incrementRecoveryAttemptCount(): Promise<number> {
  const next = (await readRecoveryAttemptCount()) + 1;
  try {
    await AsyncStorage.setItem(BOOT_ATTEMPTS_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export async function resetRecoveryAttemptCount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BOOT_ATTEMPTS_KEY);
  } catch {
    /* ignore */
  }
}

export async function shouldEnterSafeBootMode(): Promise<boolean> {
  const attempts = await readRecoveryAttemptCount();
  return attempts >= MAX_RECOVERY_ATTEMPTS;
}

export const SAFE_BOOT_MAX_ATTEMPTS = MAX_RECOVERY_ATTEMPTS;

/** テスト専用 — 復旧カウンタを設定 */
export async function setRecoveryAttemptCountForTest(count: number): Promise<void> {
  if (process.env.NODE_ENV !== 'test') return;
  try {
    await AsyncStorage.setItem(BOOT_ATTEMPTS_KEY, String(Math.max(0, count)));
  } catch {
    /* ignore */
  }
}
