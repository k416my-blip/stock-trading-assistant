import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type {
  BrokerTransactionCandidate,
  ImportBatch,
  RakutenImportStagingStore,
} from '../../types/rakutenImport';
import { isPersistedStorageAvailable } from '../../utils/storageAvailability';

let memoryStore: RakutenImportStagingStore | null = null;
let loadPromise: Promise<RakutenImportStagingStore> | null = null;

function defaultStore(): RakutenImportStagingStore {
  return { version: 1, batches: [] };
}

async function readStoreFromDisk(): Promise<RakutenImportStagingStore> {
  if (!isPersistedStorageAvailable()) {
    return defaultStore();
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.rakutenImportBatches);
    if (!raw) {
      return defaultStore();
    }
    const parsed = JSON.parse(raw) as RakutenImportStagingStore;
    return parsed?.version === 1 && Array.isArray(parsed.batches) ? parsed : defaultStore();
  } catch {
    return defaultStore();
  }
}

export function isActiveImportCandidate(candidate: BrokerTransactionCandidate): boolean {
  return candidate.status !== 'confirmed' && candidate.status !== 'rejected';
}

export async function loadRakutenImportStaging(): Promise<RakutenImportStagingStore> {
  if (memoryStore) return memoryStore;
  if (!loadPromise) {
    loadPromise = readStoreFromDisk()
      .then((store) => {
        memoryStore = store;
        return store;
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

/** Force disk reload — avoids stale in-memory store after concurrent async reads. */
export async function reloadRakutenImportStagingFromDisk(): Promise<RakutenImportStagingStore> {
  memoryStore = null;
  loadPromise = null;
  return loadRakutenImportStaging();
}

async function persistStaging(store: RakutenImportStagingStore): Promise<void> {
  memoryStore = store;
  if (!isPersistedStorageAvailable()) return;
  await AsyncStorage.setItem(STORAGE_KEYS.rakutenImportBatches, JSON.stringify(store));
}

function lookupInStore(
  store: RakutenImportStagingStore,
  candidateId: string,
  activeOnly: boolean,
): { batch: ImportBatch; candidate: BrokerTransactionCandidate } | null {
  for (const batch of store.batches) {
    const candidate = batch.candidates.find((c) => c.id === candidateId);
    if (!candidate) continue;
    if (activeOnly && !isActiveImportCandidate(candidate)) continue;
    return { batch, candidate };
  }
  return null;
}

export async function saveImportBatch(batch: ImportBatch): Promise<ImportBatch> {
  const store = await loadRakutenImportStaging();
  const idx = store.batches.findIndex((b) => b.id === batch.id);
  if (idx >= 0) {
    store.batches[idx] = batch;
  } else {
    store.batches = [batch, ...store.batches];
  }
  await persistStaging(store);
  return batch;
}

export async function upsertImportCandidate(
  batchId: string,
  candidate: BrokerTransactionCandidate,
): Promise<ImportBatch> {
  const store = await loadRakutenImportStaging();
  let batch = store.batches.find((b) => b.id === batchId);
  if (!batch) {
    batch = {
      id: batchId,
      source: candidate.source,
      candidates: [],
      createdAt: candidate.createdAt,
    };
    store.batches = [batch, ...store.batches];
  }
  const cIdx = batch.candidates.findIndex((c) => c.id === candidate.id);
  if (cIdx >= 0) {
    batch.candidates[cIdx] = candidate;
  } else {
    batch.candidates = [candidate, ...batch.candidates];
  }
  await persistStaging(store);
  return batch;
}

export async function findImportCandidate(
  candidateId: string,
  options?: { reloadIfMissing?: boolean; activeOnly?: boolean },
): Promise<{ batch: ImportBatch; candidate: BrokerTransactionCandidate } | null> {
  const activeOnly = options?.activeOnly ?? false;
  const reloadIfMissing = options?.reloadIfMissing ?? true;

  let store = await loadRakutenImportStaging();
  let found = lookupInStore(store, candidateId, activeOnly);
  if (!found && reloadIfMissing) {
    store = await reloadRakutenImportStagingFromDisk();
    found = lookupInStore(store, candidateId, activeOnly);
  }
  return found;
}

export async function findImportBatch(batchId: string): Promise<ImportBatch | null> {
  const store = await loadRakutenImportStaging();
  return store.batches.find((b) => b.id === batchId) ?? null;
}

export async function pruneConfirmedBatches(): Promise<void> {
  const store = await loadRakutenImportStaging();
  store.batches = store.batches
    .map((batch) => ({
      ...batch,
      candidates: batch.candidates.filter(
        (c) => c.status !== 'confirmed' && c.status !== 'rejected',
      ),
    }))
    .filter((batch) => batch.candidates.length > 0);
  await persistStaging(store);
}

export function resetRakutenImportStagingMemoryForTest(): void {
  memoryStore = null;
  loadPromise = null;
}
