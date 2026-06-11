/**
 * Bursa Phase 9 — 監視スナップショット・ウォッチリスト・アラート履歴
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type {
  BursaAlertHistoryEntry,
  BursaMonitoringSnapshot,
  BursaWatchlistEntry,
} from '../../types/bursaDisclosure';
import { normalizeMonitoringSnapshot } from './bursaPayloadNormalize';

const MAX_ALERT_HISTORY = 200;
const MAX_WATCHLIST = 50;

export async function readMonitoringSnapshot(): Promise<BursaMonitoringSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.bursaMonitoringSnapshot);
    if (!raw || raw.trim() === '') return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEYS.bursaMonitoringSnapshot);
      return null;
    }
    return normalizeMonitoringSnapshot(parsed);
  } catch {
    return null;
  }
}

export async function writeMonitoringSnapshot(snapshot: BursaMonitoringSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.bursaMonitoringSnapshot, JSON.stringify(snapshot));
  } catch {
    // Node / test
  }
}

export async function readBursaWatchlist(): Promise<BursaWatchlistEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.bursaWatchlist);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BursaWatchlistEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeBursaWatchlist(entries: BursaWatchlistEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.bursaWatchlist,
      JSON.stringify(entries.slice(0, MAX_WATCHLIST)),
    );
  } catch {
    // Node / test
  }
}

export async function addBursaWatchlistEntry(entry: BursaWatchlistEntry): Promise<BursaWatchlistEntry[]> {
  const list = await readBursaWatchlist();
  const code = entry.stockCode.replace(/\.KL$/i, '').trim();
  const next = [
    entry,
    ...list.filter((e) => e.stockCode.replace(/\.KL$/i, '').trim() !== code),
  ].slice(0, MAX_WATCHLIST);
  await writeBursaWatchlist(next);
  return next;
}

export async function removeBursaWatchlistEntry(stockCode: string): Promise<BursaWatchlistEntry[]> {
  const code = stockCode.replace(/\.KL$/i, '').trim();
  const next = (await readBursaWatchlist()).filter(
    (e) => e.stockCode.replace(/\.KL$/i, '').trim() !== code,
  );
  await writeBursaWatchlist(next);
  return next;
}

export async function readAlertHistory(): Promise<BursaAlertHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.bursaAlertHistory);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BursaAlertHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendAlertHistory(entries: BursaAlertHistoryEntry[]): Promise<BursaAlertHistoryEntry[]> {
  if (entries.length === 0) return readAlertHistory();
  try {
    const existing = await readAlertHistory();
    const merged = [...entries, ...existing].slice(0, MAX_ALERT_HISTORY);
    await AsyncStorage.setItem(STORAGE_KEYS.bursaAlertHistory, JSON.stringify(merged));
    return merged;
  } catch {
    return entries;
  }
}

/** テスト / verify 用インメモリバックエンド */
export type BursaMonitoringStorageBackend = {
  readSnapshot: () => Promise<BursaMonitoringSnapshot | null>;
  writeSnapshot: (s: BursaMonitoringSnapshot) => Promise<void>;
  readWatchlist: () => Promise<BursaWatchlistEntry[]>;
  writeWatchlist: (e: BursaWatchlistEntry[]) => Promise<void>;
  readAlertHistory: () => Promise<BursaAlertHistoryEntry[]>;
  appendAlertHistory: (e: BursaAlertHistoryEntry[]) => Promise<BursaAlertHistoryEntry[]>;
};

export function defaultMonitoringStorageBackend(): BursaMonitoringStorageBackend {
  return {
    readSnapshot: readMonitoringSnapshot,
    writeSnapshot: writeMonitoringSnapshot,
    readWatchlist: readBursaWatchlist,
    writeWatchlist: writeBursaWatchlist,
    readAlertHistory: readAlertHistory,
    appendAlertHistory: appendAlertHistory,
  };
}

export function inMemoryMonitoringStorageBackend(initial?: {
  snapshot?: BursaMonitoringSnapshot | null;
  watchlist?: BursaWatchlistEntry[];
  alertHistory?: BursaAlertHistoryEntry[];
}): BursaMonitoringStorageBackend {
  let snapshot = initial?.snapshot ?? null;
  let watchlist = initial?.watchlist ?? [];
  let alertHistory = initial?.alertHistory ?? [];
  return {
    readSnapshot: async () => snapshot,
    writeSnapshot: async (s) => {
      snapshot = s;
    },
    readWatchlist: async () => watchlist,
    writeWatchlist: async (e) => {
      watchlist = e;
    },
    readAlertHistory: async () => alertHistory,
    appendAlertHistory: async (e) => {
      alertHistory = [...e, ...alertHistory].slice(0, MAX_ALERT_HISTORY);
      return alertHistory;
    },
  };
}
