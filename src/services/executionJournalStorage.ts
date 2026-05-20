import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ExecutionJournalEntry, OrderStatus } from '../types/execution';
import { secureWarn } from './secureLogger';
import { parseJournalEnvelope, wrapJournalWithIntegrity } from './tamperDetection';

export type ExecutionJournalStore = {
  version: 1;
  entries: ExecutionJournalEntry[];
};

let memoryStore: ExecutionJournalStore | null = null;

function canUseAsyncStorage(): boolean {
  return typeof globalThis !== 'undefined' && 'window' in globalThis;
}

function defaultStore(): ExecutionJournalStore {
  return { version: 1, entries: [] };
}

export async function loadExecutionJournal(): Promise<ExecutionJournalStore> {
  if (memoryStore) return memoryStore;
  if (!canUseAsyncStorage()) {
    memoryStore = defaultStore();
    return memoryStore;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.executionJournal);
    if (!raw) {
      memoryStore = defaultStore();
      return memoryStore;
    }
    const { store, integrityOk } = parseJournalEnvelope(raw);
    if (!integrityOk) {
      secureWarn('[execution-journal] integrity verification failed — refusing corrupted journal');
      memoryStore = defaultStore();
      return memoryStore;
    }
    memoryStore = store;
    return store;
  } catch {
    memoryStore = defaultStore();
    return memoryStore;
  }
}

async function persistStore(store: ExecutionJournalStore): Promise<void> {
  memoryStore = store;
  if (!canUseAsyncStorage()) return;
  const envelope = wrapJournalWithIntegrity(store.entries);
  await AsyncStorage.setItem(STORAGE_KEYS.executionJournal, JSON.stringify(envelope));
}

/** ジャーナルに追記（既存行は削除しない） */
export async function appendExecutionJournalEntry(
  entry: ExecutionJournalEntry,
): Promise<ExecutionJournalEntry> {
  const store = await loadExecutionJournal();
  const idx = store.entries.findIndex((e) => e.orderId === entry.orderId);
  if (idx >= 0) {
    store.entries[idx] = entry;
  } else {
    store.entries = [entry, ...store.entries];
  }
  await persistStore(store);
  return entry;
}

export async function updateExecutionJournalEntry(
  orderId: string,
  patch: Partial<ExecutionJournalEntry> & { status?: OrderStatus },
): Promise<ExecutionJournalEntry | null> {
  const store = await loadExecutionJournal();
  const idx = store.entries.findIndex((e) => e.orderId === orderId);
  if (idx < 0) return null;
  const updated: ExecutionJournalEntry = {
    ...store.entries[idx],
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
  store.entries[idx] = updated;
  await persistStore(store);
  return updated;
}

export async function getExecutionJournalEntry(
  orderId: string,
): Promise<ExecutionJournalEntry | null> {
  const store = await loadExecutionJournal();
  return store.entries.find((e) => e.orderId === orderId) ?? null;
}

/** テスト用 — メモリのみリセット */
export function resetExecutionJournalMemoryForTest(): void {
  memoryStore = defaultStore();
}
