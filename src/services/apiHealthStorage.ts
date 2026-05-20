import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PROVIDER_IDS } from '../constants/apiSetupWizard';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ApiProviderHealth, ApiProviderId } from '../types/apiSetup';

function createDefaultProviderHealth(providerId: ApiProviderId): ApiProviderHealth {
  return {
    providerId,
    status: 'unconfigured',
    outcome: 'unconfigured',
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastErrorType: null,
    usesMockFallback: false,
    quotaNoteJa: null,
    staleNoteJa: null,
    messageJa: '未設定',
    pingSummaryJa: null,
  };
}

function normalizeProviderHealth(row: ApiProviderHealth): ApiProviderHealth {
  return {
    ...createDefaultProviderHealth(row.providerId),
    ...row,
    lastSuccessAt: row.lastSuccessAt ?? null,
    lastErrorType: row.lastErrorType ?? null,
    usesMockFallback: row.usesMockFallback ?? false,
  };
}

export type PersistedApiHealthSnapshot = {
  version: 1;
  updatedAt: string;
  providers: Record<ApiProviderId, ApiProviderHealth>;
};

export function createEmptyHealthSnapshot(): PersistedApiHealthSnapshot {
  const providers = {} as Record<ApiProviderId, ApiProviderHealth>;
  for (const id of API_PROVIDER_IDS) {
    providers[id] = createDefaultProviderHealth(id);
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    providers,
  };
}

export async function loadApiHealthSnapshot(): Promise<PersistedApiHealthSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.apiHealthSnapshot);
    if (!raw) return createEmptyHealthSnapshot();
    const parsed = JSON.parse(raw) as Partial<PersistedApiHealthSnapshot>;
    if (!parsed.providers || typeof parsed !== 'object') return createEmptyHealthSnapshot();
    const base = createEmptyHealthSnapshot();
    for (const id of API_PROVIDER_IDS) {
      const row = parsed.providers[id];
      if (row && row.providerId === id) {
        base.providers[id] = normalizeProviderHealth({ ...base.providers[id], ...row });
      }
    }
    base.updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : base.updatedAt;
    return base;
  } catch {
    return createEmptyHealthSnapshot();
  }
}

export async function saveApiHealthSnapshot(snapshot: PersistedApiHealthSnapshot): Promise<void> {
  const safe: PersistedApiHealthSnapshot = {
    version: 1,
    updatedAt: snapshot.updatedAt,
    providers: snapshot.providers,
  };
  await AsyncStorage.setItem(STORAGE_KEYS.apiHealthSnapshot, JSON.stringify(safe));
}

export async function updateProviderHealth(
  providerId: ApiProviderId,
  health: ApiProviderHealth,
): Promise<PersistedApiHealthSnapshot> {
  const snapshot = await loadApiHealthSnapshot();
  snapshot.providers[providerId] = health;
  snapshot.updatedAt = new Date().toISOString();
  await saveApiHealthSnapshot(snapshot);
  return snapshot;
}
