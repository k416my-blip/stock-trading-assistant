/**
 * X API search/recent 実接続テスト（設定画面用）
 * GET /2/tweets/search/recent?query=Maybank&max_results=10
 * Authorization: Bearer {token}
 */
import { isUsableApiKey } from './apiKeyValidation';
import { loadApiKey } from './apiKeys';
import { resolveApiKeyForConnectionTest } from './safeApiKey';
import { buildXAuthorizationHeader, resolveXBearerToken } from './xBearerToken';

const X_SEARCH_RECENT_TEST_URL =
  'https://api.twitter.com/2/tweets/search/recent?query=Maybank&max_results=10';
const X_API_TEST_TIMEOUT_MS = 12_000;

export type XApiSearchRecentTestResult = {
  ok: boolean;
  httpStatus: number;
  responseBody: string;
  tweetCount: number;
  tweetTexts: string[];
  testedAt: string;
  errorReason: string | null;
};

export function xApiSearchRecentTestErrorReasonJa(status: number): string | null {
  switch (status) {
    case 401:
      return 'Bearer Token無効または権限不足';
    case 403:
      return 'X APIプラン制限';
    case 429:
      return 'レート制限';
    default:
      return status >= 400 ? `HTTP ${status}` : null;
  }
}

async function resolveXTokenForTest(inputKey?: string): Promise<string> {
  const resolved = await resolveApiKeyForConnectionTest('x', inputKey);
  return resolveXBearerToken(resolved);
}

export async function runXApiSearchRecentTest(
  inputKey?: string,
): Promise<XApiSearchRecentTestResult> {
  const testedAt = new Date().toISOString();
  const token = await resolveXTokenForTest(inputKey);

  if (!isUsableApiKey(token)) {
    const saved = await loadApiKey('x');
    const hasSaved = isUsableApiKey(resolveXBearerToken(saved));
    return {
      ok: false,
      httpStatus: 0,
      responseBody: '',
      tweetCount: 0,
      tweetTexts: [],
      testedAt,
      errorReason: hasSaved ? 'Bearer Tokenが無効です（10文字未満・マスク表示）' : 'Bearer Token未設定',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), X_API_TEST_TIMEOUT_MS);
  try {
    const res = await fetch(X_SEARCH_RECENT_TEST_URL, {
      signal: controller.signal,
      headers: buildXAuthorizationHeader(token),
    });
    const responseBody = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        httpStatus: res.status,
        responseBody,
        tweetCount: 0,
        tweetTexts: [],
        testedAt,
        errorReason: xApiSearchRecentTestErrorReasonJa(res.status) ?? `HTTP ${res.status}`,
      };
    }

    let json: { data?: Array<{ text?: string }> };
    try {
      json = JSON.parse(responseBody) as typeof json;
    } catch {
      return {
        ok: false,
        httpStatus: res.status,
        responseBody,
        tweetCount: 0,
        tweetTexts: [],
        testedAt,
        errorReason: 'JSONパース失敗',
      };
    }

    const texts = (json.data ?? [])
      .map((t) => t.text?.trim())
      .filter((t): t is string => Boolean(t));
    const tweetCount = texts.length;

    if (tweetCount === 0) {
      return {
        ok: false,
        httpStatus: res.status,
        responseBody,
        tweetCount: 0,
        tweetTexts: [],
        testedAt,
        errorReason: '200 OK だが data件数が0',
      };
    }

    return {
      ok: true,
      httpStatus: res.status,
      responseBody,
      tweetCount,
      tweetTexts: texts.slice(0, 3),
      testedAt,
      errorReason: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      httpStatus: 0,
      responseBody: msg,
      tweetCount: 0,
      tweetTexts: [],
      testedAt,
      errorReason: msg.includes('abort') ? 'タイムアウト' : msg,
    };
  } finally {
    clearTimeout(timer);
  }
}
