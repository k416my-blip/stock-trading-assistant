/**
 * News API 接続テスト（設定画面用）
 */
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { loadApiKey } from './apiKeys';
import {
  runNewsApiConnectionTest,
  type NewsApiConnectionTestResult,
} from './newsApiConnectionDebug';
import { resolveApiKeyForConnectionTest } from './safeApiKey';

export type NewsApiEverythingTestResult = NewsApiConnectionTestResult;

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
      adoptedEndpoint: null,
      adoptedStage: null,
      adoptedAuthMode: null,
      failureKind: 'network_error',
      errorReasonJa: hasSaved ? 'APIキーが無効です（10文字未満・マスク表示）' : 'APIキー未設定',
      responseBodyMasked: '',
      responseBodySummary: '',
      responseBody: '',
      errorReason: hasSaved ? 'APIキーが無効です（10文字未満・マスク表示）' : 'APIキー未設定',
      articleCount: 0,
      titles: [],
      testedAt,
      probes: [],
      newsApiDirectOk: false,
      productionBlocked: false,
      rssFallbackOk: false,
      rssFallbackCount: 0,
      adoptedNewsSource: null,
      newsApiKeyInvalid: false,
    };
  }

  return runNewsApiConnectionTest(apiKey);
}

/** 接続テスト URL（Stage A · キーなし） */
export function connectionTestNewsApiPath(): string {
  return 'https://newsapi.org/v2/top-headlines?country=us&pageSize=5';
}
