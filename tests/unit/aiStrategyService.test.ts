import { readFileSync } from 'fs';
import { join } from 'path';
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
import {
  AI_API_CHAT_URL,
  AI_API_TIMEOUT_MS,
  AI_BOOT_CHECK_TIMEOUT_MS,
  AI_ERROR_API_KEY_MISSING,
  AI_ERROR_HTTP_400,
  AI_ERROR_HTTP_401,
  AI_ERROR_HTTP_429,
  AI_ERROR_INVALID_RESPONSE,
  AI_ERROR_TIMEOUT,
} from '../../src/constants/aiStrategy';
import { assertAiPayloadSafe } from '../../src/services/aiContextBuilder';
import * as aiApiKeyModule from '../../src/services/aiApiKey';
import { containsForbiddenExpression, sanitizeAiText } from '../../src/services/aiResponseSanitizer';
import {
  probeAiApiConnection,
  resetAiStrategyServiceForTest,
  sendAiStrategyChat,
} from '../../src/services/aiStrategyService';
import { DEFAULT_AI_PREFERENCES } from '../../src/services/aiPreferencesStorage';
import { minimalAiStrategyContext } from '../helpers/aiContextFixture';
import { DUMMY_API_KEY } from '../helpers/dummyCredentials';

const basePrefs = { ...DEFAULT_AI_PREFERENCES };

const baseContext = minimalAiStrategyContext({
  journalSummary: {
    totalEntries: 2,
    uncertainCount: 0,
    inFlightCount: 0,
    reconciliationMismatchCount: 0,
    recentSymbols: ['1155'],
  },
});

const validApiJson = {
  conclusion: '保有推奨',
  reason: 'トレンド維持',
  risk: '古い株価に注意',
  urgency: '低',
  confidence: '65%',
  dataFreshness: '直近更新を確認',
  followUp: '証券画面で価格確認',
  body: '1155は様子見が無難です。最終判断はユーザー自身が行ってください。',
};

function responsesBody(content: string) {
  return {
    output_text: content,
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: content }],
      },
    ],
  };
}

function mockFetchOk() {
  return vi.fn(async () => ({
    ok: true,
    json: async () => responsesBody(JSON.stringify(validApiJson)),
  })) as unknown as typeof fetch;
}

function mockFetchFail(status = 500) {
  return vi.fn(async () => ({
    ok: false,
    status,
    json: async () => ({}),
  })) as unknown as typeof fetch;
}

describe('aiStrategyService', () => {
  afterEach(() => {
    resetAiStrategyServiceForTest();
    vi.restoreAllMocks();
  });

  it('uses official responses API URL and timeouts', () => {
    expect(AI_API_CHAT_URL).toBe('https://api.openai.com/v1/responses');
    expect(AI_API_TIMEOUT_MS).toBe(30_000);
    expect(AI_BOOT_CHECK_TIMEOUT_MS).toBe(5_000);
  });

  it('probe returns api_key_missing immediately when key is empty', async () => {
    vi.spyOn(aiApiKeyModule, 'loadAiApiKeyWithTimeout').mockResolvedValue({
      key: '',
      timedOut: false,
      failed: false,
    });
    const probe = await probeAiApiConnection({
      preferences: basePrefs,
      apiKey: '',
    });
    expect(probe.requestStatus).toBe('api_key_missing');
    expect(probe.isLoading).toBe(false);
    expect(probe.errorJa).toBe(AI_ERROR_API_KEY_MISSING);
  });

  it('probe finishes within boot timeout when key load hangs', async () => {
    vi.spyOn(aiApiKeyModule, 'loadAiApiKeyWithTimeout').mockResolvedValue({
      key: '',
      timedOut: true,
      failed: true,
    });
    const probe = await probeAiApiConnection({ preferences: basePrefs });
    expect(probe.isLoading).toBe(false);
    expect(probe.requestStatus).toBe('error');
  });

  it('returns API response on success via responses API shape', async () => {
    const result = await sendAiStrategyChat({
      userMessage: '1155はどう？',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: mockFetchOk(),
    });
    expect(result.source).toBe('api');
    expect(result.isLoading).toBe(false);
    expect(result.requestStatus).toBe('success');
    expect(result.structured.conclusion).toBe('保有推奨');
  });

  it('falls back to mock when API fails', async () => {
    const result = await sendAiStrategyChat({
      userMessage: 'なぜ買い推奨？',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: mockFetchFail(),
    });
    expect(result.usedMockFallback).toBe(true);
    expect(result.isLoading).toBe(false);
    expect(result.requestStatus).toBe('fallback_mock');
  });

  it('returns timeout status and message on API timeout', async () => {
    vi.useFakeTimers();
    const hangingFetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    ) as unknown as typeof fetch;

    const pending = sendAiStrategyChat({
      userMessage: '緊急性は？',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: hangingFetch,
    });
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await pending;
    vi.useRealTimers();
    expect(hangingFetch).toHaveBeenCalledTimes(1);
    expect(result.requestStatus).toBe('timeout');
    expect(result.isLoading).toBe(false);
    expect(result.errorJa).toBe('タイムアウトしました');
    expect(result.text).toBe('タイムアウトしました');
    expect(result.usedMockFallback).toBe(false);
  });

  it('shows Japanese error when API key is missing', async () => {
    vi.spyOn(aiApiKeyModule, 'loadAiApiKeyWithTimeout').mockResolvedValue({
      key: '',
      timedOut: false,
      failed: false,
    });
    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
      apiKey: '',
    });
    expect(result.requestStatus).toBe('api_key_missing');
    expect(result.isLoading).toBe(false);
    expect(result.errorJa).toBe(AI_ERROR_API_KEY_MISSING);
  });

  it('handles API key load failure', async () => {
    vi.spyOn(aiApiKeyModule, 'loadAiApiKeyWithTimeout').mockResolvedValue({
      key: '',
      timedOut: true,
      failed: true,
    });
    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
    });
    expect(result.isLoading).toBe(false);
    expect(result.requestStatus).toBe('error');
  });

  it('handles HTTP 400 with fallback mock and Japanese error', async () => {
    const badRequestFetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: 'Invalid schema', type: 'invalid_request_error' },
      }),
    })) as unknown as typeof fetch;

    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: badRequestFetch,
    });
    expect(result.requestStatus).toBe('fallback_mock');
    expect(result.errorJa).toContain('モック応答に切り替え');
    expect(result.fallbackReasonJa).toBeTruthy();
  });

  it('handles failed response envelope with fallback mock', async () => {
    const failedFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: 'failed',
        error: { message: 'model error', type: 'server_error' },
        output: [],
      }),
    })) as unknown as typeof fetch;

    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: failedFetch,
    });
    expect(result.usedMockFallback).toBe(true);
    expect(result.errorJa).toContain('モック応答に切り替え');
    expect(result.fallbackReasonJa).toContain('failed');
  });

  it('handles HTTP 401 with fallback mock', async () => {
    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: mockFetchFail(401),
    });
    expect(result.requestStatus).toBe('fallback_mock');
    expect(result.isLoading).toBe(false);
    expect(result.errorJa).toContain('モック応答に切り替え');
    expect(result.fallbackReasonJa).toContain('認証');
  });

  it('handles HTTP 429 with fallback mock', async () => {
    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: mockFetchFail(429),
    });
    expect(result.requestStatus).toBe('fallback_mock');
    expect(result.isLoading).toBe(false);
    expect(result.errorJa).toContain('モック応答に切り替え');
    expect(result.fallbackReasonJa).toContain('429');
  });

  it('handles network error with fallback mock', async () => {
    const networkFetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: networkFetch,
    });
    expect(networkFetch).toHaveBeenCalledTimes(2);
    expect(result.requestStatus).toBe('fallback_mock');
    expect(result.isLoading).toBe(false);
    expect(result.usedMockFallback).toBe(true);
    expect(result.fallbackReasonJa).toContain('再試行');
  });

  it('retries once then succeeds on temporary network failure', async () => {
    const networkFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          output_text: JSON.stringify(validApiJson),
          status: 'completed',
        }),
      }) as unknown as typeof fetch;

    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: networkFetch,
    });

    expect(networkFetch).toHaveBeenCalledTimes(2);
    expect(result.source).toBe('api');
    expect(result.usedMockFallback).toBe(false);
    expect(result.requestStatus).toBe('success');
  });

  it('does not retry on HTTP 401', async () => {
    const fetch401 = mockFetchFail(401);
    const result = await sendAiStrategyChat({
      userMessage: 'テスト',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: fetch401,
    });
    expect(fetch401).toHaveBeenCalledTimes(1);
    expect(result.usedMockFallback).toBe(true);
  });

  it('aborts in-flight request when signal is aborted', async () => {
    const controller = new AbortController();
    const hangingFetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    ) as unknown as typeof fetch;

    const pending = sendAiStrategyChat({
      userMessage: 'abort test',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: hangingFetch,
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects forbidden expressions in API output', async () => {
    const badFetch = vi.fn(async () => ({
      ok: true,
      json: async () =>
        responsesBody(
          JSON.stringify({
            ...validApiJson,
            body: '必ず買ってください。利益保証です。',
          }),
        ),
    })) as unknown as typeof fetch;

    const result = await sendAiStrategyChat({
      userMessage: '買う？',
      context: baseContext,
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: badFetch,
    });
    expect(result.usedMockFallback).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  it('does not log raw payload in service source', () => {
    const src = readFileSync(join(process.cwd(), 'src/services/aiStrategyService.ts'), 'utf8');
    const constants = readFileSync(join(process.cwd(), 'src/constants/aiStrategy.ts'), 'utf8');
    expect(src).not.toMatch(/console\.log\([^)]*JSON\.stringify\(userPayload/);
    expect(src).toMatch(/secureLog/);
    expect(src).toMatch(/buildFixedAiInstructions/);
    expect(constants).toContain('/v1/responses');
  });

  it('rejects API output missing stale disclosure when context has stale holdings', async () => {
    const badFetch = vi.fn(async () => ({
      ok: true,
      json: async () =>
        responsesBody(
          JSON.stringify({
            conclusion: '買い推奨',
            reason: 'モメンタム不明',
            risk: '流動性に注意',
            urgency: '低',
            confidence: '50%',
            followUp: '証券画面で確認',
            body: '買い推奨です。最終判断はユーザー自身が行ってください。',
          }),
        ),
    })) as unknown as typeof fetch;

    const staleCtx = minimalAiStrategyContext({ staleHoldingsCount: 3 });
    const result = await sendAiStrategyChat({
      userMessage: '詳細分析して',
      context: minimalAiStrategyContext({
        staleHoldingsCount: 3,
        concierge: {
          ...staleCtx.concierge,
          conversationMode: 'analysis',
          currentQuestion: '詳細分析して',
        },
      }),
      preferences: basePrefs,
      apiKey: DUMMY_API_KEY,
      fetchImpl: badFetch,
    });
    expect(result.usedMockFallback).toBe(true);
  });

  it('assertAiPayloadSafe rejects secrets in context', () => {
    expect(() =>
      assertAiPayloadSafe(
        minimalAiStrategyContext({
          riskMode: 'apikey=leaked-secret-value',
        }),
      ),
    ).toThrow(/forbidden/i);
  });

  it('sanitizer blocks forbidden Japanese phrases', () => {
    expect(containsForbiddenExpression('必ず買ってください')).toBe(true);
    const cleaned = sanitizeAiText('参考: 利益保証はありません');
    expect(cleaned).not.toMatch(/利益保証/);
  });
});
