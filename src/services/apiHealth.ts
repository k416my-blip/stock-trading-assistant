import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { loadApiKey } from './apiKeys';
import { testTwelveDataConnection } from './marketDataService';
import {
  logTwelveDataConnectionTestFailure,
  logTwelveDataConnectionTestProbe,
  resolveTwelveDataKeyForTest,
} from './twelveDataConnectionTest';
import { testOpenAiResponsesConnection } from './openAiConnectionTest';
import type { SupportedApiProviderId } from '../config/apiProviders';
import { X_HTTP_402_USER_MESSAGE_JA } from '../constants/xApiOptional';
import { resolveApiKeyForConnectionTest } from './safeApiKey';

const API_TIMEOUT_MS = 8000;
const API_MAX_RETRIES = 2;

export type ApiConnectionState = 'idle' | 'ok' | 'error' | 'testing';

export type ApiConnectionResult = {
  ok: boolean;
  message: string;
  checkedAt: string;
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(task: () => Promise<ApiConnectionResult>): Promise<ApiConnectionResult> {
  let last: ApiConnectionResult | null = null;
  for (let attempt = 0; attempt <= API_MAX_RETRIES; attempt += 1) {
    last = await task();
    if (last.ok) return last;
  }
  return (
    last ?? {
      ok: false,
      message: '接続失敗',
      checkedAt: new Date().toISOString(),
    }
  );
}

function result(ok: boolean, message: string): ApiConnectionResult {
  return { ok, message, checkedAt: new Date().toISOString() };
}

const REAL_API_CONNECTION_SUCCESS_JA = '実API接続成功';
const REAL_API_CONNECTION_FAIL_JA = '実API接続失敗';

async function testOpenAi(apiKey: string): Promise<ApiConnectionResult> {
  const tested = await testOpenAiResponsesConnection(apiKey, { timeoutMs: API_TIMEOUT_MS });
  return result(
    tested.outcome === 'success',
    tested.outcome === 'success' ? REAL_API_CONNECTION_SUCCESS_JA : tested.messageJa,
  );
}

async function testTwelveData(apiKey: string): Promise<ApiConnectionResult> {
  const resolved = await resolveTwelveDataKeyForTest(apiKey);
  if (!isUsableApiKey(resolved)) {
    return result(false, REAL_API_CONNECTION_FAIL_JA);
  }
  logTwelveDataConnectionTestProbe(resolved);
  try {
    const quote = await testTwelveDataConnection(resolved);
    return result(Boolean(quote.price), REAL_API_CONNECTION_SUCCESS_JA);
  } catch (e) {
    logTwelveDataConnectionTestFailure(e);
    return result(false, REAL_API_CONNECTION_FAIL_JA);
  }
}

async function testNewsApi(apiKey: string): Promise<ApiConnectionResult> {
  try {
    const { runNewsApiConnectionTest, failureKindLabelJa } = await import('./newsApiConnectionDebug');
    const tested = await runNewsApiConnectionTest(apiKey);
    if (tested.ok) {
      return result(
        true,
        tested.tempRateLimit ? 'NewsAPI 利用上限（一時）' : REAL_API_CONNECTION_SUCCESS_JA,
      );
    }
    return result(false, tested.errorReasonJa ?? failureKindLabelJa(tested.failureKind));
  } catch {
    return result(false, 'NewsAPI タイムアウト/接続失敗');
  }
}

async function testRedditApi(apiKey: string): Promise<ApiConnectionResult> {
  try {
    const bearer = normalizeStoredApiKey(apiKey);
    const res = await fetchWithTimeout(
      'https://oauth.reddit.com/api/v1/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'User-Agent': 'stock-trading-assistant/1.0',
        },
      },
      API_TIMEOUT_MS,
    );
    if (res.ok) return result(true, REAL_API_CONNECTION_SUCCESS_JA);
    if (res.status === 401) return result(false, 'Bearer Token 無効または期限切れ');
    if (res.status === 403) return result(false, 'Reddit API 権限不足');
    if (res.status === 429) return result(false, 'Rate Limit 超過');
    return result(false, `Reddit API エラー (${res.status})`);
  } catch {
    return result(false, 'Reddit API タイムアウト/接続失敗');
  }
}

async function testXApi(apiKey: string): Promise<ApiConnectionResult> {
  try {
    const bearer = apiKey.trim().replace(/^Bearer\s+/i, '');
    const url = 'https://api.twitter.com/2/tweets/search/recent?query=bitcoin&max_results=10';
    const res = await fetchWithTimeout(
      url,
      { method: 'GET', headers: { Authorization: `Bearer ${bearer}` } },
      API_TIMEOUT_MS,
    );
    const bodyText = await res.text();

    console.log('[x-api] connection-test', {
      url,
      status: res.status,
      ok: res.ok,
    });

    if (res.ok) {
      let tweetCount = 0;
      try {
        const parsed = JSON.parse(bodyText) as { data?: unknown[] };
        tweetCount = Array.isArray(parsed.data) ? parsed.data.length : 0;
      } catch {
        /* ignore */
      }
      if (tweetCount > 0) return result(true, 'X API 接続成功');
      return result(true, 'X API 認証成功（search/recent 結果0件 · キーは有効）');
    }
    if (res.status === 401) return result(false, 'Bearer Token 無効または権限不足');
    if (res.status === 402) {
      return result(
        true,
        `X API キーは有効（402: ${X_HTTP_402_USER_MESSAGE_JA} · 保存は可能）`,
      );
    }
    if (res.status === 403) {
      return result(
        false,
        'X API プラン制限（search/recent は Basic 以上が必要な場合があります）',
      );
    }
    if (res.status === 429) return result(false, 'Rate Limit 超過');
    return result(false, `X API エラー (${res.status})`);
  } catch {
    return result(false, 'X API タイムアウト/接続失敗');
  }
}

async function testAlphaVantage(apiKey: string): Promise<ApiConnectionResult> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, { method: 'GET' }, API_TIMEOUT_MS);
    if (!res.ok) return result(false, `Alpha Vantage エラー (${res.status})`);
    const data = (await res.json()) as { 'Global Quote'?: Record<string, string>; Note?: string; ErrorMessage?: string };
    if (data.Note) return result(false, 'Alpha Vantage 利用上限');
    if (data.ErrorMessage) return result(false, 'Alpha Vantage キー無効');
    if (data['Global Quote']) return result(true, 'Alpha Vantage 接続成功');
    return result(false, 'Alpha Vantage 応答不正');
  } catch {
    return result(false, 'Alpha Vantage タイムアウト/接続失敗');
  }
}

async function testFinnhub(apiKey: string): Promise<ApiConnectionResult> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, { method: 'GET' }, API_TIMEOUT_MS);
    if (!res.ok) return result(false, `Finnhub エラー (${res.status})`);
    const data = (await res.json()) as { c?: number; error?: string };
    if (typeof data.c === 'number') return result(true, 'Finnhub 接続成功');
    if (data.error) return result(false, 'Finnhub キー無効');
    return result(false, 'Finnhub 応答不正');
  } catch {
    return result(false, 'Finnhub タイムアウト/接続失敗');
  }
}

async function testPolygon(apiKey: string): Promise<ApiConnectionResult> {
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, { method: 'GET' }, API_TIMEOUT_MS);
    const bodyText = await res.text();
    let data: { status?: string; results?: unknown[]; error?: string; message?: string } = {};
    try {
      data = JSON.parse(bodyText) as typeof data;
    } catch {
      return result(false, 'Polygon 応答パース失敗');
    }

    if (res.status === 401 || res.status === 403) {
      return result(false, `Polygon キー無効または権限不足 (${res.status})`);
    }
    if (!res.ok) {
      return result(false, `Polygon エラー (${res.status})`);
    }

    const status = String(data.status ?? '').toUpperCase();
    if (status === 'ERROR') {
      const err = data.error ?? data.message ?? '不明';
      return result(false, `Polygon キー無効（${err}）`);
    }
    // Free tier often returns DELAYED with empty results — key is still valid
    if (status === 'OK' || status === 'DELAYED') {
      const count = Array.isArray(data.results) ? data.results.length : 0;
      if (count > 0) return result(true, 'Polygon 接続成功');
      return result(true, 'Polygon 認証成功（DELAYED/結果0件 · キーは有効）');
    }
    if (Array.isArray(data.results) && data.results.length > 0) {
      return result(true, 'Polygon 接続成功');
    }
    if (data.error) return result(false, 'Polygon キー無効');
    return result(false, `Polygon 応答不正（status=${status || 'unknown'}）`);
  } catch {
    return result(false, 'Polygon タイムアウト/接続失敗');
  }
}

const FMP_STABLE_QUOTE_ENDPOINT = '/stable/quote';
const FMP_BROWSER_REFERENCE_URL =
  'https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey={API_KEY}';
const FMP_OFFICIAL_DOCS =
  'https://site.financialmodelingprep.com/developer/docs/quickstart';

function redactApiKeyInUrl(url: string): string {
  return url.replace(/([?&]apikey=)[^&]+/i, '$1****');
}

function buildFmpQuoteUrl(apiKey: string): string {
  // ブラウザ成功URLと同じ query 順序: symbol → apikey
  return `https://financialmodelingprep.com${FMP_STABLE_QUOTE_ENDPOINT}?symbol=AAPL&apikey=${encodeURIComponent(apiKey)}`;
}

function buildBrowserUrlDiff(appUrl: string, apiKey: string): {
  browserReferenceUrl: string;
  appUrlRedacted: string;
  pathnameMatch: boolean;
  hostMatch: boolean;
  symbolParam: string | null;
  apikeyParamPresent: boolean;
  encodingChangedKey: boolean;
  queryOrder: string[];
  diffs: string[];
} {
  const browserReferenceUrl = redactApiKeyInUrl(
    FMP_BROWSER_REFERENCE_URL.replace('{API_KEY}', apiKey),
  );
  const appUrlRedacted = redactApiKeyInUrl(appUrl);
  let parsed: URL | null = null;
  try {
    parsed = new URL(appUrl);
  } catch {
    parsed = null;
  }
  const symbolParam = parsed?.searchParams.get('symbol') ?? null;
  const apikeyParamPresent = Boolean(parsed?.searchParams.get('apikey'));
  const encodingChangedKey = encodeURIComponent(apiKey) !== apiKey;
  const queryOrder = parsed ? [...parsed.searchParams.keys()] : [];
  const diffs: string[] = [];
  if (!parsed) diffs.push('app URL parse failed');
  if (parsed && parsed.hostname !== 'financialmodelingprep.com') {
    diffs.push(`host differs: ${parsed.hostname}`);
  }
  if (parsed && parsed.pathname !== FMP_STABLE_QUOTE_ENDPOINT) {
    diffs.push(`path differs: ${parsed.pathname} (expected ${FMP_STABLE_QUOTE_ENDPOINT})`);
  }
  if (symbolParam !== 'AAPL') diffs.push(`symbol differs: ${symbolParam ?? '(missing)'}`);
  if (!apikeyParamPresent) diffs.push('apikey query param missing');
  if (encodingChangedKey) diffs.push('apikey was URL-encoded (browser paste is usually raw)');
  if (appUrlRedacted !== browserReferenceUrl) {
    diffs.push('redacted URL shape differs from browser reference');
  }
  return {
    browserReferenceUrl,
    appUrlRedacted,
    pathnameMatch: parsed?.pathname === FMP_STABLE_QUOTE_ENDPOINT,
    hostMatch: parsed?.hostname === 'financialmodelingprep.com',
    symbolParam,
    apikeyParamPresent,
    encodingChangedKey,
    queryOrder,
    diffs,
  };
}

function logFmpConnectionTest(payload: Record<string, unknown>): void {
  // Metro で truncation されにくいよう JSON 1行でも出力
  console.log('[fmp-api] connection-test', payload);
  try {
    console.log('[fmp-api] connection-test-json', JSON.stringify(payload, null, 2));
  } catch {
    console.log('[fmp-api] connection-test-json', '(stringify failed)');
  }
}

function fmpApiKeyFingerprint(apiKey: string): {
  apikeyPrefix: string;
  apikeySuffix: string;
  apikeyLength: number;
} {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { apikeyPrefix: '(empty)', apikeySuffix: '(empty)', apikeyLength: 0 };
  }
  if (trimmed.length <= 8) {
    return { apikeyPrefix: '****', apikeySuffix: '****', apikeyLength: trimmed.length };
  }
  return {
    apikeyPrefix: trimmed.slice(0, 4),
    apikeySuffix: trimmed.slice(-4),
    apikeyLength: trimmed.length,
  };
}

function classifyFmp403(bodyText: string): 'invalid_key' | 'free_plan' | 'endpoint_limit' | 'unknown' {
  const lower = bodyText.toLowerCase();
  if (
    lower.includes('legacy endpoint') ||
    lower.includes('legacy endpoints') ||
    lower.includes('no longer supported') ||
    lower.includes('upgrade your plan') ||
    lower.includes('subscription page')
  ) {
    return 'endpoint_limit';
  }
  if (
    lower.includes('free plan') ||
    lower.includes('not available on your plan') ||
    lower.includes('premium endpoint') ||
    lower.includes('available for premium')
  ) {
    return 'free_plan';
  }
  if (
    lower.includes('invalid api key') ||
    lower.includes('invalid or missing api key') ||
    lower.includes('missing api key') ||
    lower.includes('wrong api key')
  ) {
    return 'invalid_key';
  }
  // FMP quickstart: 403 = Invalid or missing API key
  if (lower.includes('<html') || lower.includes('403 forbidden')) {
    return 'invalid_key';
  }
  return 'unknown';
}

function fmp403Message(kind: ReturnType<typeof classifyFmp403>): string {
  switch (kind) {
    case 'invalid_key':
      return 'APIキー無効';
    case 'free_plan':
      return 'Freeプラン制限';
    case 'endpoint_limit':
      return 'endpoint制限';
    default:
      return 'APIキー無効（FMP公式: 403は無効/欠落キー。プラン/endpoint制限の可能性あり）';
  }
}

function isFmpQuoteSuccess(data: unknown): boolean {
  if (data == null || typeof data !== 'object') return false;
  if (Array.isArray(data)) {
    if (data.length === 0) return false;
    return data.some((row) => isFmpQuoteRowSuccess(row));
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['Error Message'] === 'string') return false;
  if (typeof obj.Error === 'string') return false;
  return isFmpQuoteRowSuccess(obj);
}

function isFmpQuoteRowSuccess(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false;
  const quote = row as Record<string, unknown>;
  if (quote.symbol === 'AAPL') return true;
  const price = quote.price ?? quote.regularMarketPrice ?? quote.close;
  return typeof price === 'number' && Number.isFinite(price) && price > 0;
}

async function testFmp(apiKey: string, attempt = 1): Promise<ApiConnectionResult> {
  const endpointName = FMP_STABLE_QUOTE_ENDPOINT;
  const trimmedKey = normalizeStoredApiKey(apiKey);
  const url = buildFmpQuoteUrl(trimmedKey);
  const urlBeforeFetch = url;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
  };
  const sentKeyFingerprint = fmpApiKeyFingerprint(trimmedKey);
  const savedKey = await loadApiKey('fmp');
  const savedKeyFingerprint = fmpApiKeyFingerprint(savedKey);
  const savedMatchesSent = trimmedKey === normalizeStoredApiKey(savedKey);
  const browserUrlDiff = buildBrowserUrlDiff(url, trimmedKey);

  logFmpConnectionTest({
    phase: 'before-fetch',
    attempt,
    endpointName,
    actualUrl: redactApiKeyInUrl(url),
    urlBeforeFetch: redactApiKeyInUrl(urlBeforeFetch),
    sentKeyFingerprint,
    savedKeyFingerprint,
    savedMatchesSent,
    rawInputLength: apiKey.length,
    trimmedKeyLength: trimmedKey.length,
    browserUrlDiff,
    requestHeaders,
    officialDocs: FMP_OFFICIAL_DOCS,
  });

  try {
    const res = await fetchWithTimeout(
      urlBeforeFetch,
      { method: 'GET', headers: requestHeaders },
      API_TIMEOUT_MS,
    );
    const bodyText = await res.text();
    let parsedBody: unknown = bodyText;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      /* keep raw text */
    }

    const forbiddenUrl = res.status === 403 ? res.url || urlBeforeFetch : null;

    logFmpConnectionTest({
      phase: 'after-fetch',
      attempt,
      endpointName,
      actualUrl: redactApiKeyInUrl(url),
      urlBeforeFetch: redactApiKeyInUrl(urlBeforeFetch),
      fetchAfterStatus: res.status,
      httpStatus: res.status,
      ok: res.ok,
      responseUrl: res.url ? redactApiKeyInUrl(res.url) : null,
      forbiddenUrl: forbiddenUrl ? redactApiKeyInUrl(forbiddenUrl) : null,
      sentKeyFingerprint,
      savedKeyFingerprint,
      savedMatchesSent,
      requestHeaders,
      responseBodyFull: bodyText,
      response: {
        data: parsedBody,
      },
      browserUrlDiff,
      officialDocs: FMP_OFFICIAL_DOCS,
    });

    if (res.ok) {
      if (isFmpQuoteSuccess(parsedBody)) return result(true, 'FMP 接続成功');
      logFmpConnectionTest({
        phase: 'parse-failure',
        attempt,
        endpointName,
        message: 'HTTP成功だが quote 判定失敗',
        responseBodyFull: bodyText,
        response: { data: parsedBody },
      });
      return result(false, 'FMP 応答不正');
    }

    if (res.status === 403) {
      const kind = classifyFmp403(bodyText);
      return result(false, fmp403Message(kind));
    }
    if (res.status === 401) return result(false, 'APIキー無効');
    if (res.status === 429) return result(false, 'Rate Limit 超過');
    return result(false, `FMP エラー (${res.status})`);
  } catch (e) {
    logFmpConnectionTest({
      phase: 'exception',
      attempt,
      endpointName,
      actualUrl: redactApiKeyInUrl(url),
      urlBeforeFetch: redactApiKeyInUrl(urlBeforeFetch),
      sentKeyFingerprint,
      savedKeyFingerprint,
      savedMatchesSent,
      requestHeaders,
      browserUrlDiff,
      error: e instanceof Error ? e.message : String(e),
    });
    return result(false, 'FMP タイムアウト/接続失敗');
  }
}

export async function testApiConnection(
  providerId: SupportedApiProviderId,
  apiKeyInput: string,
): Promise<ApiConnectionResult> {
  const apiKey = await resolveApiKeyForConnectionTest(providerId, apiKeyInput);
  if (providerId === 'twelve_data') {
    return testTwelveData(apiKey);
  }
  if (!apiKey.trim()) return result(false, REAL_API_CONNECTION_FAIL_JA);
  // FMP は同一URLを withRetry で3連打すると診断ログが混線するため単発実行
  if (providerId === 'fmp') {
    return testFmp(apiKey);
  }
  const run = async () => {
    switch (providerId) {
      case 'openai':
        return testOpenAi(apiKey);
      case 'newsapi':
        return testNewsApi(apiKey);
      case 'x':
        return testXApi(apiKey);
      case 'reddit':
        return testRedditApi(apiKey);
      case 'alpha_vantage':
        return testAlphaVantage(apiKey);
      case 'finnhub':
        return testFinnhub(apiKey);
      case 'polygon':
        return testPolygon(apiKey);
    }
  };
  return withRetry(run);
}
