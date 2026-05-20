import { AI_API_TIMEOUT_MS } from '../constants/aiStrategy';
import type { ApiProviderId, ApiProviderHealth, ApiVerificationOutcome } from '../types/apiSetup';
import { createDefaultProviderHealth } from './apiHealthDashboard';
import { loadApiHealthSnapshot } from './apiHealthStorage';
import { testOpenAiResponsesConnection } from './openAiConnectionTest';
import { isUsableApiKey } from './apiKeyValidation';

const DEFAULT_TIMEOUT_MS = AI_API_TIMEOUT_MS;

type VerifyResult = {
  outcome: ApiVerificationOutcome;
  messageJa: string;
  quotaNoteJa: string | null;
  pingSummaryJa: string | null;
};

function normalizeKey(raw: string): string {
  let key = raw.trim();
  if (/^bearer\s+/i.test(key)) {
    key = key.replace(/^bearer\s+/i, '').trim();
  }
  return key;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function outcomeFromHttp(status: number): ApiVerificationOutcome {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'connection_error';
  if (status >= 400) return 'invalid_key';
  return 'success';
}

function quotaFromHeaders(res: Response): string | null {
  const remaining =
    res.headers.get('x-ratelimit-remaining') ??
    res.headers.get('x-rate-limit-remaining') ??
    res.headers.get('x-ratelimit-remaining-requests');
  if (remaining != null) {
    return `残りリクエスト目安: ${remaining}`;
  }
  return null;
}

async function verifyOpenAi(
  apiKey: string,
  timeoutMs: number,
  fetchImpl?: typeof fetch,
): Promise<VerifyResult> {
  const tested = await testOpenAiResponsesConnection(apiKey, { timeoutMs, fetchImpl });
  const outcome = tested.outcome;
  return {
    outcome,
    messageJa: tested.messageJa,
    quotaNoteJa: tested.quotaNoteJa,
    pingSummaryJa: tested.pingSummaryJa,
  };
}

async function verifyNewsApi(apiKey: string, timeoutMs: number): Promise<VerifyResult> {
  const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
    const outcome = outcomeFromHttp(res.status);
    if (outcome === 'success') {
      return {
        outcome: 'success',
        messageJa: '接続成功',
        quotaNoteJa: quotaFromHeaders(res),
        pingSummaryJa: 'headlines ping OK',
      };
    }
    if (outcome === 'rate_limited') {
      return {
        outcome: 'rate_limited',
        messageJa: 'quota制限',
        quotaNoteJa: 'News APIの利用上限に達した可能性',
        pingSummaryJa: null,
      };
    }
    if (outcome === 'invalid_key') {
      return { outcome: 'invalid_key', messageJa: 'APIキー無効', quotaNoteJa: null, pingSummaryJa: null };
    }
    return {
      outcome: 'connection_error',
      messageJa: '接続エラー',
      quotaNoteJa: null,
      pingSummaryJa: `HTTP ${res.status}`,
    };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { outcome: 'timeout', messageJa: 'timeout', quotaNoteJa: null, pingSummaryJa: null };
    }
    return { outcome: 'connection_error', messageJa: '接続エラー', quotaNoteJa: null, pingSummaryJa: null };
  }
}

async function verifyEarningsApi(apiKey: string, timeoutMs: number): Promise<VerifyResult> {
  const url = `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
    const outcome = outcomeFromHttp(res.status);
    if (outcome === 'success') {
      return {
        outcome: 'success',
        messageJa: '接続成功',
        quotaNoteJa: quotaFromHeaders(res),
        pingSummaryJa: 'quote ping OK',
      };
    }
    if (outcome === 'rate_limited') {
      return {
        outcome: 'rate_limited',
        messageJa: 'quota制限',
        quotaNoteJa: 'Finnhub等の利用上限の可能性',
        pingSummaryJa: null,
      };
    }
    if (outcome === 'invalid_key') {
      return { outcome: 'invalid_key', messageJa: 'APIキー無効', quotaNoteJa: null, pingSummaryJa: null };
    }
    return {
      outcome: 'connection_error',
      messageJa: '接続エラー',
      quotaNoteJa: null,
      pingSummaryJa: `HTTP ${res.status}`,
    };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { outcome: 'timeout', messageJa: 'timeout', quotaNoteJa: null, pingSummaryJa: null };
    }
    return { outcome: 'connection_error', messageJa: '接続エラー', quotaNoteJa: null, pingSummaryJa: null };
  }
}

async function verifyRedditBearer(apiKey: string, timeoutMs: number): Promise<VerifyResult> {
  try {
    const res = await fetchWithTimeout(
      'https://oauth.reddit.com/api/v1/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'stock-trading-assistant/1.0 (setup-wizard)',
        },
      },
      timeoutMs,
    );
    const outcome = outcomeFromHttp(res.status);
    if (outcome === 'success') {
      return {
        outcome: 'success',
        messageJa: '接続成功',
        quotaNoteJa: quotaFromHeaders(res),
        pingSummaryJa: 'reddit /me ping OK',
      };
    }
    if (outcome === 'rate_limited') {
      return {
        outcome: 'rate_limited',
        messageJa: 'quota制限',
        quotaNoteJa: 'Reddit API制限の可能性',
        pingSummaryJa: null,
      };
    }
    if (outcome === 'invalid_key') {
      return {
        outcome: 'invalid_key',
        messageJa: 'APIキー無効',
        quotaNoteJa: null,
        pingSummaryJa: '手動取得したBearerトークンを確認してください',
      };
    }
    return {
      outcome: 'connection_error',
      messageJa: '接続エラー',
      quotaNoteJa: null,
      pingSummaryJa: `HTTP ${res.status}`,
    };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { outcome: 'timeout', messageJa: 'timeout', quotaNoteJa: null, pingSummaryJa: null };
    }
    return { outcome: 'connection_error', messageJa: '接続エラー', quotaNoteJa: null, pingSummaryJa: null };
  }
}

async function verifyXApi(apiKey: string, timeoutMs: number): Promise<VerifyResult> {
  try {
    const res = await fetchWithTimeout(
      'https://api.twitter.com/2/users/me',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      },
      timeoutMs,
    );
    const outcome = outcomeFromHttp(res.status);
    if (outcome === 'success') {
      return {
        outcome: 'success',
        messageJa: '接続成功',
        quotaNoteJa: quotaFromHeaders(res),
        pingSummaryJa: 'X users/me ping OK',
      };
    }
    if (outcome === 'rate_limited') {
      return {
        outcome: 'rate_limited',
        messageJa: 'quota制限',
        quotaNoteJa: 'X API利用上限の可能性',
        pingSummaryJa: null,
      };
    }
    if (outcome === 'invalid_key') {
      return { outcome: 'invalid_key', messageJa: 'APIキー無効', quotaNoteJa: null, pingSummaryJa: null };
    }
    return {
      outcome: 'connection_error',
      messageJa: '接続エラー',
      quotaNoteJa: null,
      pingSummaryJa: `HTTP ${res.status}`,
    };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { outcome: 'timeout', messageJa: 'timeout', quotaNoteJa: null, pingSummaryJa: null };
    }
    return { outcome: 'connection_error', messageJa: '接続エラー', quotaNoteJa: null, pingSummaryJa: null };
  }
}

function statusFromOutcome(outcome: ApiVerificationOutcome): ApiProviderHealth['status'] {
  switch (outcome) {
    case 'success':
      return 'ok';
    case 'rate_limited':
      return 'rate_limited';
    case 'unconfigured':
      return 'unconfigured';
    case 'parse_error':
      return 'error';
    default:
      return 'error';
  }
}

function errorTypeFromOutcome(outcome: ApiVerificationOutcome): string | null {
  switch (outcome) {
    case 'success':
      return null;
    case 'invalid_key':
      return 'auth';
    case 'rate_limited':
      return 'rate_limit';
    case 'timeout':
      return 'timeout';
    case 'parse_error':
      return 'parse';
    case 'connection_error':
      return 'network';
    default:
      return 'unknown';
  }
}

export async function verifyApiProvider(
  providerId: ApiProviderId,
  apiKeyRaw: string,
  options?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<ApiProviderHealth> {
  const apiKey = normalizeKey(apiKeyRaw);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!isUsableApiKey(apiKey)) {
    return {
      ...createDefaultProviderHealth(providerId),
      outcome: 'unconfigured',
      status: 'unconfigured',
      messageJa: '未設定',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  let result: VerifyResult;
  switch (providerId) {
    case 'openai':
      result = await verifyOpenAi(apiKey, timeoutMs, options?.fetchImpl);
      break;
    case 'news':
      result = await verifyNewsApi(apiKey, timeoutMs);
      break;
    case 'earnings':
      result = await verifyEarningsApi(apiKey, timeoutMs);
      break;
    case 'reddit':
      result = await verifyRedditBearer(apiKey, timeoutMs);
      break;
    case 'x':
      result = await verifyXApi(apiKey, timeoutMs);
      break;
    default:
      result = {
        outcome: 'connection_error',
        messageJa: '接続エラー',
        quotaNoteJa: null,
        pingSummaryJa: null,
      };
  }

  const snapshot = await loadApiHealthSnapshot();
  const previous = snapshot.providers[providerId];
  const now = new Date().toISOString();
  const success = result.outcome === 'success';
  return {
    providerId,
    status: statusFromOutcome(result.outcome),
    outcome: result.outcome,
    lastCheckedAt: now,
    lastSuccessAt: success ? now : previous?.lastSuccessAt ?? null,
    lastErrorType: success ? null : errorTypeFromOutcome(result.outcome),
    usesMockFallback: !success && isUsableApiKey(apiKey),
    quotaNoteJa: result.quotaNoteJa,
    staleNoteJa: null,
    messageJa: result.messageJa,
    pingSummaryJa: result.pingSummaryJa,
  };
}

export function connectingHealth(providerId: ApiProviderId): ApiProviderHealth {
  return {
    ...createDefaultProviderHealth(providerId),
    status: 'connecting',
    outcome: 'connection_error',
    messageJa: '接続中',
    lastCheckedAt: null,
  };
}
