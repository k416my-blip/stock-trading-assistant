import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/productionStability/productionStabilityRuntime', () => ({
  shouldPauseConciergeAi: () => false,
  shouldThrottleConciergeAi: () => false,
  shouldAllowOpenAiRequest: () => true,
  setOrchestratorProactiveGates: vi.fn(),
}));

vi.mock('../../src/services/productionStability/apiCircuitBreaker', () => ({
  isCircuitOpen: () => false,
  recordApiFailure: vi.fn(),
  recordApiSuccess: vi.fn(),
}));

vi.mock('../../src/services/performanceCostRuntime', () => ({
  shouldPauseApiRequests: () => false,
  noteNetworkSuccess: vi.fn(),
  noteNetworkFailure: vi.fn(),
}));
import { statusLabelJa } from '../../src/services/apiConnectionStatusMapper';
import {
  isMaskedOrEmptyApiKey,
  isUsableApiKey,
  normalizeStoredApiKey,
} from '../../src/services/apiKeyValidation';
import { testOpenAiResponsesConnection } from '../../src/services/openAiConnectionTest';
import {
  probeAiApiConnection,
  resetAiStrategyServiceForTest,
  sendAiStrategyChat,
  testAiApiConnection,
} from '../../src/services/aiStrategyService';
import * as secretStorage from '../../src/services/secretStorage';
import { buildApiRegistry } from '../../src/services/apiRegistryService';
import { testApiRegistryConnection } from '../../src/services/apiConnectionTestService';
import { minimalAiStrategyContext } from '../helpers/aiContextFixture';
import {
  DUMMY_API_KEY,
  DUMMY_API_KEY_BEARER,
  DUMMY_API_KEY_UNVERIFIED,
} from '../helpers/dummyCredentials';

import { DEFAULT_AI_PREFERENCES } from '../../src/services/aiPreferencesStorage';

const basePrefs = { ...DEFAULT_AI_PREFERENCES };

const validApiJson = {
  conclusion: '参考',
  reason: 'テスト',
  risk: '低',
  urgency: '低',
  confidence: '65%',
  dataFreshness: '直近更新を確認',
  followUp: '確認',
  body: 'テスト回答です。',
};

describe('apiConnectionDiagnostics', () => {
  afterEach(() => {
    resetAiStrategyServiceForTest();
    vi.restoreAllMocks();
  });
  it('labels key_saved_unverified separately from connected', () => {
    expect(statusLabelJa('key_saved_unverified')).toBe('APIキー保存済み・未確認');
    expect(statusLabelJa('connected')).toBe('接続成功');
  });

  it('rejects masked keys', () => {
    expect(isMaskedOrEmptyApiKey('****')).toBe(true);
    expect(isMaskedOrEmptyApiKey(DUMMY_API_KEY)).toBe(false);
    expect(isUsableApiKey(normalizeStoredApiKey(DUMMY_API_KEY_BEARER))).toBe(true);
  });

  it('probe shows unverified when key exists but never tested', async () => {
    const probe = await probeAiApiConnection({
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY_UNVERIFIED,
    });
    expect(probe.hasApiKey).toBe(true);
    expect(probe.apiConnected).toBe(false);
    expect(probe.connectionStatus).toBe('key_saved_unverified');
    expect(probe.statusJa).toBe('APIキー保存済み・未確認');
  });

  it('connection test success reports connected', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        output_text: '{"body":"ok"}',
        status: 'completed',
      }),
    })) as unknown as typeof fetch;

    const result = await testAiApiConnection({
      apiKey: DUMMY_API_KEY,
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    expect(result.connectionStatus).toBe('connected');
    expect(result.messageJa).toContain('実API接続成功');
  });

  it('maps 401 to auth error message', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'invalid api key' } }),
    })) as unknown as typeof fetch;

    const tested = await testOpenAiResponsesConnection(DUMMY_API_KEY, { fetchImpl });
    expect(tested.outcome).toBe('invalid_key');
    expect(tested.messageJa).toContain('無効');
  });

  it('maps 429 to rate limit', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const tested = await testOpenAiResponsesConnection(DUMMY_API_KEY, { fetchImpl });
    expect(tested.outcome).toBe('rate_limited');
  });

  it('maps timeout', async () => {
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          const err = new DOMException('Aborted', 'AbortError');
          reject(err);
        }),
    ) as unknown as typeof fetch;

    const tested = await testOpenAiResponsesConnection(DUMMY_API_KEY, {
      fetchImpl,
      timeoutMs: 5,
    });
    expect(tested.outcome).toBe('timeout');
    expect(tested.messageJa).toContain('タイムアウト');
  });

  it('maps missing output_text to parse failure', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ output: [] }),
    })) as unknown as typeof fetch;

    const tested = await testOpenAiResponsesConnection(DUMMY_API_KEY, { fetchImpl });
    expect(tested.parseSuccess).toBe(false);
    expect(tested.messageJa).toContain('応答形式');
  });

  it('mock fallback includes reason on API failure', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: minimalAiStrategyContext(),
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl,
    });
    expect(result.usedMockFallback).toBe(true);
    expect(result.apiConnected).toBe(false);
    expect(result.fallbackReasonJa).toContain('認証');
    expect(result.errorJa).toContain('モック応答に切り替え');
  });

  it('does not use mock fallback when API succeeds', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify({
          body: '回答です。最終判断はユーザー自身が行ってください。',
          reason: 'テスト',
          risk: '低',
          urgency: '低',
          confidence: '70%',
          dataFreshness: 'fresh',
        }),
      }),
    })) as unknown as typeof fetch;

    const { sendAiStrategyChat } = await import('../../src/services/aiStrategyService');
    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: minimalAiStrategyContext(),
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl,
    });
    expect(result.source).toBe('api');
    expect(result.usedMockFallback).toBe(false);
    expect(result.apiConnected).toBe(true);
  });

  it('builds api registry with openai and twelve_data', async () => {
    const registry = await buildApiRegistry();
    const ids = registry.map((r) => r.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('twelve_data');
    expect(ids).toContain('news');
  });

  it('registry openai test returns structured result', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ output_text: '{"body":"ping"}' }),
    })) as unknown as typeof fetch;

    const result = await testApiRegistryConnection('openai', {
      fetchImpl,
      apiKey: DUMMY_API_KEY,
    });
    expect(result.apiId).toBe('openai');
    expect(result.status).toBe('connected');
  });
});
