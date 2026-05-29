import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ExecutionJournalEntry, OrderStatus } from '../types/execution';
import { isPersistedStorageAvailable } from '../utils/storageAvailability';
import { secureWarn } from './secureLogger';
import { parseJournalEnvelope, wrapJournalWithIntegrity } from './tamperDetection';

export type ExecutionJournalStore = {
  version: 1;
  entries: ExecutionJournalEntry[];
};

let memoryStore: ExecutionJournalStore | null = null;

function defaultStore(): ExecutionJournalStore {
  return { version: 1, entries: [] };
}

export async function loadExecutionJournal(): Promise<ExecutionJournalStore> {
  if (memoryStore) return memoryStore;
  if (!isPersistedStorageAvailable()) {
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
  if (!isPersistedStorageAvailable()) return;
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

/** 整合性ハッシュ不一致時にエントリを再保存して修復 */
export async function repairExecutionJournalIntegrity(): Promise<boolean> {
  if (!isPersistedStorageAvailable()) return false;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.executionJournal);
    if (!raw) return false;
    const { store, integrityOk } = parseJournalEnvelope(raw);
    if (integrityOk) return false;
    if (!Array.isArray(store.entries)) return false;
    const envelope = wrapJournalWithIntegrity(store.entries);
    await AsyncStorage.setItem(STORAGE_KEYS.executionJournal, JSON.stringify(envelope));
    memoryStore = { version: 1, entries: envelope.entries };
    console.log('[execution-journal] integrity repaired', { entries: envelope.entries.length });
    return true;
  } catch (err) {
    secureWarn(
      '[execution-journal] repair failed',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

/** テスト用 — メモリのみリセット */
export function resetExecutionJournalMemoryForTest(): void {
  memoryStore = defaultStore();
}
