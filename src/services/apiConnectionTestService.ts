import { AI_API_TIMEOUT_MS } from '../constants/aiStrategy';
import type { ApiConnectionTestResult, ApiRegistryId } from '../types/apiConnection';
import type { ApiProviderHealth, ApiProviderId } from '../types/apiSetup';
import {
  connectionStatusFromVerification,
  errorTypeFromVerificationOutcome,
} from './apiConnectionStatusMapper';
import { updateProviderHealth, loadApiHealthSnapshot } from './apiHealthStorage';
import { verifyApiProvider } from './apiVerificationService';
import { getSecret } from './secretStorage';
import { isUsableApiKey } from './apiKeyValidation';
import { testTwelveDataConnection } from './marketDataService';
import {
  logTwelveDataConnectionTestProbe,
  resolveTwelveDataKeyForTest,
} from './twelveDataConnectionTest';

const TEST_TIMEOUT_MS = AI_API_TIMEOUT_MS;

function registryToWizard(id: ApiRegistryId): ApiProviderId | null {
  if (id === 'twelve_data') return null;
  return id;
}

function secretIdFor(id: ApiRegistryId): Parameters<typeof getSecret>[0] {
  switch (id) {
    case 'openai':
      return 'aiApiKey';
    case 'twelve_data':
      return 'twelveDataApiKey';
    case 'news':
      return 'newsApiKey';
    case 'earnings':
      return 'earningsApiKey';
    case 'reddit':
      return 'redditApiKey';
    case 'x':
      return 'xApiKey';
  }
}

async function testTwelveData(apiKey: string): Promise<ApiConnectionTestResult> {
  const checkedAt = new Date().toISOString();
  const resolved = await resolveTwelveDataKeyForTest(apiKey);
  if (!isUsableApiKey(resolved)) {
    return {
      apiId: 'twelve_data',
      status: 'not_configured',
      errorType: 'none',
      messageJa: '未設定',
      quotaStatus: null,
      pingSummaryJa: null,
      checkedAt,
      successAt: null,
    };
  }
  logTwelveDataConnectionTestProbe(resolved);
  try {
    const quote = await testTwelveDataConnection(resolved);
    const ok = Number.isFinite(quote.price) && quote.price > 0;
    return {
      apiId: 'twelve_data',
      status: ok ? 'connected' : 'parse_error',
      errorType: ok ? 'none' : 'parse',
      messageJa: ok ? '実API接続成功' : '実API接続失敗',
      quotaStatus: null,
      pingSummaryJa: ok ? `quote ${quote.symbol}` : null,
      checkedAt,
      successAt: ok ? checkedAt : null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : '';
    const timedOut = msg.includes('timeout') || msg.includes('abort');
    return {
      apiId: 'twelve_data',
      status: timedOut ? 'timeout' : 'network_error',
      errorType: timedOut ? 'timeout' : 'network',
      messageJa: timedOut ? '実API接続失敗' : '実API接続失敗',
      quotaStatus: null,
      pingSummaryJa: null,
      checkedAt,
      successAt: null,
    };
  }
}

function toTestResult(
  apiId: ApiRegistryId,
  health: ApiProviderHealth,
  hasKey: boolean,
): ApiConnectionTestResult {
  const status = connectionStatusFromVerification({
    hasKey,
    outcome: health.outcome,
    lastCheckedAt: health.lastCheckedAt,
    lastSuccessAt: health.lastSuccessAt,
  });
  return {
    apiId,
    status,
    errorType: errorTypeFromVerificationOutcome(health.outcome),
    messageJa: health.messageJa,
    quotaStatus: health.quotaNoteJa,
    pingSummaryJa: health.pingSummaryJa,
    checkedAt: health.lastCheckedAt ?? new Date().toISOString(),
    successAt: health.lastSuccessAt,
  };
}

export async function testApiRegistryConnection(
  apiId: ApiRegistryId,
  options?: { fetchImpl?: typeof fetch; apiKey?: string },
): Promise<ApiConnectionTestResult> {
  const key = options?.apiKey ?? (await getSecret(secretIdFor(apiId)));

  if (apiId === 'twelve_data') {
    return testTwelveData(key);
  }

  const wizardId = registryToWizard(apiId);
  if (!wizardId) {
    return {
      apiId,
      status: 'test_not_implemented',
      errorType: 'unknown',
      messageJa: '接続テスト未実装',
      quotaStatus: null,
      pingSummaryJa: null,
      checkedAt: new Date().toISOString(),
      successAt: null,
    };
  }

  const health = await verifyApiProvider(wizardId, key, {
    timeoutMs: TEST_TIMEOUT_MS,
    fetchImpl: options?.fetchImpl,
  });

  const snapshot = await loadApiHealthSnapshot();
  const previous = snapshot.providers[wizardId];
  const merged: ApiProviderHealth = {
    ...health,
    lastSuccessAt:
      health.outcome === 'success'
        ? health.lastCheckedAt
        : previous?.lastSuccessAt ?? health.lastSuccessAt,
    usesMockFallback: health.outcome !== 'success' && isUsableApiKey(key),
  };
  await updateProviderHealth(wizardId, merged);

  return toTestResult(apiId, merged, isUsableApiKey(key));
}

export async function testAllApiRegistryConnections(): Promise<ApiConnectionTestResult[]> {
  const ids: ApiRegistryId[] = ['openai', 'twelve_data', 'news', 'earnings', 'reddit', 'x'];
  const results: ApiConnectionTestResult[] = [];
  for (const id of ids) {
    results.push(await testApiRegistryConnection(id));
  }
  return results;
}
