import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type {
  RakutenImportAuditEntry,
  RakutenImportAuditStore,
} from '../../types/rakutenImport';
import { isPersistedStorageAvailable } from '../../utils/storageAvailability';

let memoryStore: RakutenImportAuditStore | null = null;

function defaultStore(): RakutenImportAuditStore {
  return { version: 1, entries: [] };
}

export async function loadRakutenImportAudit(): Promise<RakutenImportAuditStore> {
  if (memoryStore) return memoryStore;
  if (!isPersistedStorageAvailable()) {
    memoryStore = defaultStore();
    return memoryStore;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.rakutenImportAudit);
    if (!raw) {
      memoryStore = defaultStore();
      return memoryStore;
    }
    const parsed = JSON.parse(raw) as RakutenImportAuditStore;
    memoryStore =
      parsed?.version === 1 && Array.isArray(parsed.entries) ? parsed : defaultStore();
    return memoryStore;
  } catch {
    memoryStore = defaultStore();
    return memoryStore;
  }
}

async function persistAudit(store: RakutenImportAuditStore): Promise<void> {
  memoryStore = store;
  if (!isPersistedStorageAvailable()) return;
  await AsyncStorage.setItem(STORAGE_KEYS.rakutenImportAudit, JSON.stringify(store));
}

/** 監査ログ追記（不変 — 削除しない） */
export async function appendRakutenImportAuditEntry(
  entry: RakutenImportAuditEntry,
): Promise<RakutenImportAuditEntry> {
  const store = await loadRakutenImportAudit();
  store.entries = [entry, ...store.entries];
  await persistAudit(store);
  return entry;
}

export function resetRakutenImportAuditMemoryForTest(): void {
  memoryStore = null;
}

export function createAuditEntry(
  partial: Omit<RakutenImportAuditEntry, 'id' | 'at'> & { at?: string },
): RakutenImportAuditEntry {
  return {
    ...partial,
    id: `import-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: partial.at ?? new Date().toISOString(),
  };
}
