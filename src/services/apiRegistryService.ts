import { SECRET_KEYS } from '../constants/secretStorage';
import type { ApiRegistryEntry, ApiRegistryId } from '../types/apiConnection';
import type { ApiProviderHealth, ApiProviderId } from '../types/apiSetup';
import {
  connectionStatusFromVerification,
  errorTypeFromVerificationOutcome,
  statusLabelJa,
} from './apiConnectionStatusMapper';
import { loadApiHealthSnapshot } from './apiHealthStorage';
import { getSecret } from './secretStorage';
import { isUsableApiKey } from './apiKeyValidation';

type RegistryDef = Omit<
  ApiRegistryEntry,
  | 'status'
  | 'lastCheckedAt'
  | 'lastSuccessAt'
  | 'lastErrorType'
  | 'lastErrorMessage'
  | 'quotaStatus'
  | 'usesMockFallback'
  | 'diagnosticsSummary'
  | 'hasKeyConfigured'
>;

const REGISTRY_DEFS: RegistryDef[] = [
  {
    id: 'openai',
    displayName: 'OpenAI',
    secureStoreKey: SECRET_KEYS.aiApiKey,
    provider: 'openai',
    category: 'ai',
    isRequired: true,
    testImplemented: true,
  },
  {
    id: 'twelve_data',
    displayName: 'Twelve Data / 市場データ',
    secureStoreKey: SECRET_KEYS.twelveDataApiKey,
    provider: 'twelvedata',
    category: 'market_data',
    isRequired: true,
    testImplemented: true,
  },
  {
    id: 'news',
    displayName: 'News API',
    secureStoreKey: SECRET_KEYS.newsApiKey,
    provider: 'newsapi',
    category: 'news',
    isRequired: false,
    testImplemented: true,
  },
  {
    id: 'earnings',
    displayName: 'Financial / Earnings API',
    secureStoreKey: SECRET_KEYS.earningsApiKey,
    provider: 'finnhub',
    category: 'financial',
    isRequired: false,
    testImplemented: true,
  },
  {
    id: 'reddit',
    displayName: 'Reddit API',
    secureStoreKey: SECRET_KEYS.redditApiKey,
    provider: 'reddit',
    category: 'social',
    isRequired: false,
    testImplemented: true,
  },
  {
    id: 'x',
    displayName: 'X API',
    secureStoreKey: SECRET_KEYS.xApiKey,
    provider: 'x',
    category: 'social',
    isRequired: false,
    testImplemented: true,
  },
];

function wizardIdForRegistry(id: ApiRegistryId): ApiProviderId | null {
  if (id === 'twelve_data') return null;
  return id;
}

function buildEntry(
  def: RegistryDef,
  key: string,
  health: ApiProviderHealth | null,
): ApiRegistryEntry {
  const hasKey = isUsableApiKey(key);
  const outcome = health?.outcome ?? 'unconfigured';
  const status = connectionStatusFromVerification({
    hasKey,
    outcome,
    lastCheckedAt: health?.lastCheckedAt ?? null,
    lastSuccessAt: health?.lastSuccessAt ?? null,
  });
  const errorType = health?.lastErrorType
    ? (health.lastErrorType as ApiRegistryEntry['lastErrorType'])
    : errorTypeFromVerificationOutcome(outcome);
  const message = health?.messageJa ?? (hasKey ? 'キー保存済み・未確認' : '未設定');

  return {
    ...def,
    status,
    lastCheckedAt: health?.lastCheckedAt ?? null,
    lastSuccessAt: health?.lastSuccessAt ?? null,
    lastErrorType: errorType,
    lastErrorMessage: message,
    quotaStatus: health?.quotaNoteJa ?? null,
    usesMockFallback: health?.usesMockFallback ?? (!hasKey || status !== 'connected'),
    diagnosticsSummary: `${def.displayName}: ${statusLabelJa(status)} — ${message}`,
    hasKeyConfigured: hasKey,
  };
}

export async function buildApiRegistry(): Promise<ApiRegistryEntry[]> {
  const snapshot = await loadApiHealthSnapshot();
  const entries: ApiRegistryEntry[] = [];

  for (const def of REGISTRY_DEFS) {
    const secretId = def.id === 'openai'
      ? 'aiApiKey'
      : def.id === 'twelve_data'
        ? 'twelveDataApiKey'
        : def.id === 'news'
          ? 'newsApiKey'
          : def.id === 'earnings'
            ? 'earningsApiKey'
            : def.id === 'reddit'
              ? 'redditApiKey'
              : 'xApiKey';

    const key = await getSecret(secretId);
    const wizardId = wizardIdForRegistry(def.id);
    const health = wizardId ? snapshot.providers[wizardId] : null;
    entries.push(buildEntry(def, key, health));
  }

  return entries;
}

export function registryEntryForOpenAi(
  aiKey: string,
  health: ApiProviderHealth | null,
): ApiRegistryEntry {
  const def = REGISTRY_DEFS.find((d) => d.id === 'openai')!;
  return buildEntry(def, aiKey, health);
}
