import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type {
  BrokerTransactionCandidate,
  ImportBatch,
  RakutenImportStagingStore,
} from '../../types/rakutenImport';
import { isPersistedStorageAvailable } from '../../utils/storageAvailability';

let memoryStore: RakutenImportStagingStore | null = null;

function defaultStore(): RakutenImportStagingStore {
  return { version: 1, batches: [] };
}

export async function loadRakutenImportStaging(): Promise<RakutenImportStagingStore> {
  if (memoryStore) return memoryStore;
  if (!isPersistedStorageAvailable()) {
    memoryStore = defaultStore();
    return memoryStore;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.rakutenImportBatches);
    if (!raw) {
      memoryStore = defaultStore();
      return memoryStore;
    }
    const parsed = JSON.parse(raw) as RakutenImportStagingStore;
    memoryStore =
      parsed?.version === 1 && Array.isArray(parsed.batches) ? parsed : defaultStore();
    return memoryStore;
  } catch {
    memoryStore = defaultStore();
    return memoryStore;
  }
}

async function persistStaging(store: RakutenImportStagingStore): Promise<void> {
  memoryStore = store;
  if (!isPersistedStorageAvailable()) return;
  await AsyncStorage.setItem(STORAGE_KEYS.rakutenImportBatches, JSON.stringify(store));
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
): Promise<{ batch: ImportBatch; candidate: BrokerTransactionCandidate } | null> {
  const store = await loadRakutenImportStaging();
  for (const batch of store.batches) {
    const candidate = batch.candidates.find((c) => c.id === candidateId);
    if (candidate) return { batch, candidate };
  }
  return null;
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
}
