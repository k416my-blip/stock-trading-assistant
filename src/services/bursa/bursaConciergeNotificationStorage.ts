/**
 * Bursa Phase 10 — コンシェルジュ通知ストレージ
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { BursaConciergeNotification } from '../../types/bursaDisclosure';

const MAX_STORED = 300;

export async function readConciergeNotifications(): Promise<BursaConciergeNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.bursaConciergeNotifications);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BursaConciergeNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeConciergeNotifications(
  items: BursaConciergeNotification[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.bursaConciergeNotifications,
      JSON.stringify(items.slice(0, MAX_STORED)),
    );
  } catch {
    // Node / test
  }
}

export async function readConciergeSoundEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.bursaConciergeSound);
    if (raw == null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

export async function writeConciergeSoundEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.bursaConciergeSound, enabled ? '1' : '0');
  } catch {
    // Node / test
  }
}

export async function markConciergeNotificationRead(id: string): Promise<void> {
  const items = await readConciergeNotifications();
  const next = items.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  await writeConciergeNotifications(next);
}

export async function markAllConciergeNotificationsRead(): Promise<void> {
  const items = await readConciergeNotifications();
  await writeConciergeNotifications(items.map((n) => ({ ...n, isRead: true })));
}

export function mergeConciergeNotifications(
  existing: BursaConciergeNotification[],
  incoming: BursaConciergeNotification[],
): { merged: BursaConciergeNotification[]; newCount: number } {
  const map = new Map(existing.map((n) => [n.id, n]));
  let newCount = 0;
  for (const n of incoming) {
    if (!map.has(n.id)) {
      newCount++;
      map.set(n.id, n);
    }
  }
  const merged = [...map.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  return { merged: merged.slice(0, MAX_STORED), newCount };
}

/** テスト / verify 用 */
export type ConciergeNotificationStorageBackend = {
  readNotifications: () => Promise<BursaConciergeNotification[]>;
  writeNotifications: (n: BursaConciergeNotification[]) => Promise<void>;
  readSoundEnabled: () => Promise<boolean>;
  writeSoundEnabled: (v: boolean) => Promise<void>;
};

export function defaultConciergeStorageBackend(): ConciergeNotificationStorageBackend {
  return {
    readNotifications: readConciergeNotifications,
    writeNotifications: writeConciergeNotifications,
    readSoundEnabled: readConciergeSoundEnabled,
    writeSoundEnabled: writeConciergeSoundEnabled,
  };
}

export function inMemoryConciergeStorageBackend(initial?: {
  notifications?: BursaConciergeNotification[];
  soundEnabled?: boolean;
}): ConciergeNotificationStorageBackend {
  let notifications = initial?.notifications ?? [];
  let soundEnabled = initial?.soundEnabled ?? true;
  return {
    readNotifications: async () => notifications,
    writeNotifications: async (n) => {
      notifications = n;
    },
    readSoundEnabled: async () => soundEnabled,
    writeSoundEnabled: async (v) => {
      soundEnabled = v;
    },
  };
}
