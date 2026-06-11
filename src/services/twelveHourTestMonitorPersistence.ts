/**
 * 12時間テスト監視 — AsyncStorage 永続化（プロセス再起動・logcat ロスト対策）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { TwelveHourTestMonitorReport } from '../types/twelveHourTestMonitor';

export type TwelveHourMonitorPersisted = TwelveHourTestMonitorReport & {
  heartbeatCount: number;
  persistedAt: string;
  testEnded: boolean;
};

export async function persistTwelveHourMonitorSnapshot(
  snapshot: TwelveHourMonitorPersisted,
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.twelveHourTestMonitor, JSON.stringify(snapshot));
  } catch {
    /* non-fatal */
  }
}

export async function loadTwelveHourMonitorSnapshot(): Promise<TwelveHourMonitorPersisted | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.twelveHourTestMonitor);
    if (!raw) return null;
    return JSON.parse(raw) as TwelveHourMonitorPersisted;
  } catch {
    return null;
  }
}

export async function clearTwelveHourMonitorSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.twelveHourTestMonitor);
  } catch {
    /* non-fatal */
  }
}
