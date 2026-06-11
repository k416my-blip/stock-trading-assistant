/**
 * News API everything エンドポイント実接続テスト（設定画面用）
 * GET /v2/everything?q=Maybank&pageSize=5
 * Header: X-Api-Key
 */
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { loadApiKey } from './apiKeys';
import { resolveApiKeyForConnectionTest } from './safeApiKey';
import {
  classifyNewsApiFailure,
  isNewsApiTempRateLimit,
  NEWSAPI_TEMP_RATE_LIMIT,
} from '../constants/newsApiRateLimit';

const NEWS_EVERYTHING_TEST_URL = 'https://newsapi.org/v2/everything?q=Maybank&pageSize=5';
const NEWS_API_TEST_TIMEOUT_MS = 12_000;

export type NewsApiEverythingTestResult = {
  ok: boolean;
  httpStatus: number;
  responseBody: string;
  articleCount: number;
  titles: string[];
  testedAt: string;
  errorReason: string | null;
  /** 429 + rateLimited の一時制限（キー障害ではない） */
  tempRateLimit?: boolean;
  failureClass?: ReturnType<typeof classifyNewsApiFailure>;
};

async function resolveNewsApiKeyForTest(inputKey?: string): Promise<string> {
  const resolved = await resolveApiKeyForConnectionTest('newsapi', inputKey);
  return isUsableApiKey(resolved) ? normalizeStoredApiKey(resolved) : '';
}

export async function runNewsApiEverythingTest(
  inputKey?: string,
): Promise<NewsApiEverythingTestResult> {
  const testedAt = new Date().toISOString();
  const apiKey = await resolveNewsApiKeyForTest(inputKey);

  if (!apiKey) {
    const saved = await loadApiKey('newsapi');
    const hasSaved = isUsableApiKey(saved);
    return {
      ok: false,
      httpStatus: 0,
      responseBody: '',
      articleCount: 0,
      titles: [],
      testedAt,
      errorReason: hasSaved ? 'APIキーが無効です（10文字未満・マスク表示）' : 'APIキー未設定',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_API_TEST_TIMEOUT_MS);
  try {
    const res = await fetch(NEWS_EVERYTHING_TEST_URL, {
      signal: controller.signal,
      headers: { 'X-Api-Key': apiKey },
    });
    const responseBody = await res.text();

    if (!res.ok) {
      const tempRateLimit = isNewsApiTempRateLimit({ httpStatus: res.status, responseBody });
      return {
        ok: tempRateLimit,
        httpStatus: res.status,
        responseBody,
        articleCount: 0,
        titles: [],
        testedAt,
        errorReason: tempRateLimit ? NEWSAPI_TEMP_RATE_LIMIT : `HTTP ${res.status}`,
        tempRateLimit,
        failureClass: classifyNewsApiFailure({
          httpStatus: res.status,
          responseBody,
          hasApiKey: true,
        }),
      };
    }

    let json: { articles?: Array<{ title?: string }>; status?: string; message?: string; code?: string };
    try {
      json = JSON.parse(responseBody) as typeof json;
    } catch {
      return {
        ok: false,
        httpStatus: res.status,
        responseBody,
        articleCount: 0,
        titles: [],
        testedAt,
        errorReason: 'JSONパース失敗',
      };
    }

    if (json.status === 'error') {
      const tempRateLimit = isNewsApiTempRateLimit({
        httpStatus: res.status,
        responseBody,
        errorCode: json.code,
      });
      return {
        ok: tempRateLimit,
        httpStatus: res.status,
        responseBody,
        articleCount: 0,
        titles: [],
        testedAt,
        errorReason: tempRateLimit
          ? NEWSAPI_TEMP_RATE_LIMIT
          : json.message ?? 'News API error',
        tempRateLimit,
        failureClass: classifyNewsApiFailure({
          httpStatus: res.status,
          responseBody,
          hasApiKey: true,
        }),
      };
    }

    const titles = (json.articles ?? [])
      .map((a) => a.title?.trim())
      .filter((t): t is string => Boolean(t));

    return {
      ok: true,
      httpStatus: res.status,
      responseBody,
      articleCount: titles.length,
      titles,
      testedAt,
      errorReason: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      httpStatus: 0,
      responseBody: msg,
      articleCount: 0,
      titles: [],
      testedAt,
      errorReason: msg.includes('abort') ? 'タイムアウト' : msg,
    };
  } finally {
    clearTimeout(timer);
  }
}
