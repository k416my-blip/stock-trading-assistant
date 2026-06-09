/**
 * NewsAPI 診断ログ — [NEWS_API_DEBUG]
 */
import type { AnalysisApiKeys } from './analysisApiKeys';
import { loadAnalysisApiKeys } from './analysisApiKeys';
import { loadApiKey } from './apiKeys';
import { redactFetchUrl } from './conciergeOperationalFetchLog';
import {
  connectionTestNewsUrl,
  inspectNewsApiKeySources,
  keysMatch,
  readSecureStoreNewsKey,
  type NewsApiKeyOrigin,
} from './newsApiKeyResolver';

export type NewsApiEndpoint = 'top-headlines' | 'everything';

export type NewsApiJsonBody = {
  status?: string;
  code?: string;
  message?: string;
  articles?: unknown[];
};

export type NewsApiDebugPayload = {
  apiKeyExists: boolean;
  apiKeyLength: number;
  apiKeyOrigin: NewsApiKeyOrigin;
  apiKeyFingerprint: string | null;
  endpoint: NewsApiEndpoint;
  status: number | string;
  responseBodyCode: string | null;
  responseBodyMessage: string | null;
  responseBody: unknown;
  articlesCount: number;
  error: string | null;
  /** マスク済み完全URL（apiKey=***） */
  requestUrl: string;
  operationalUrls: {
    topHeadlines: string;
    everything: string;
  };
  keySources: Awaited<ReturnType<typeof inspectNewsApiKeySources>>;
  keyComparison: {
    operationalMatchesConnectionTest: boolean;
    operationalMatchesSecureStore: boolean;
    operationalMatchesFreshLoad: boolean;
    connectionTestEndpoint: string;
    noteJa?: string;
  };
};

export function extractNewsApiErrorCode(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const code = (json as NewsApiJsonBody).code;
  return typeof code === 'string' && code.length > 0 ? code : null;
}

export function extractNewsApiErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const message = (json as NewsApiJsonBody).message;
  return typeof message === 'string' && message.length > 0 ? message : null;
}

export function buildOperationalNewsUrls(query: string, apiKey: string): {
  topHeadlines: string;
  everything: string;
} {
  const q = encodeURIComponent(query);
  const key = encodeURIComponent(apiKey.trim());
  return {
    topHeadlines: redactFetchUrl(
      `https://newsapi.org/v2/top-headlines?q=${q}&language=en&pageSize=6&apiKey=${key}`,
    ),
    everything: redactFetchUrl(
      `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${key}`,
    ),
  };
}

export function logNewsApiDebug(payload: NewsApiDebugPayload): void {
  const code = payload.responseBodyCode;
  console.warn(
    '[NEWS_API_DEBUG]',
    JSON.stringify({
      apiKeyExists: payload.apiKeyExists,
      apiKeyLength: payload.apiKeyLength,
      apiKeyOrigin: payload.apiKeyOrigin,
      apiKeyFingerprint: payload.apiKeyFingerprint,
      endpoint: payload.endpoint,
      status: payload.status,
      responseBodyCode: code,
      responseBodyMessage: payload.responseBodyMessage,
      articlesCount: payload.articlesCount,
      error: payload.error,
      requestUrl: payload.requestUrl,
      operationalUrls: payload.operationalUrls,
      isApiKeyInvalid: code === 'apiKeyInvalid',
      isUpgradeRequired: code === 'upgradeRequired' || payload.status === 426,
      isRateLimited: code === 'rateLimited' || payload.status === 429,
      keySources: payload.keySources,
      keyComparison: payload.keyComparison,
    }),
  );
}

export async function buildNewsApiDebugContext(
  operationalKey: string,
  operationalOrigin: NewsApiKeyOrigin,
  stateKeys: AnalysisApiKeys,
  query: string,
): Promise<Pick<NewsApiDebugPayload, 'keySources' | 'keyComparison' | 'operationalUrls'>> {
  const [keySources, connectionKey, secureKey, freshLoad] = await Promise.all([
    inspectNewsApiKeySources(stateKeys.newsApiKey),
    loadApiKey('newsapi'),
    readSecureStoreNewsKey(),
    loadAnalysisApiKeys(),
  ]);

  const sameAsConnection = keysMatch(operationalKey, connectionKey);
  const sameAsSecure = keysMatch(operationalKey, secureKey);
  const sameAsFresh = keysMatch(operationalKey, freshLoad.newsApiKey);

  let noteJa: string | undefined;
  if (!sameAsConnection && connectionKey) {
    noteJa = '接続テストと実運用でキー不一致';
  }

  return {
    keySources,
    operationalUrls: buildOperationalNewsUrls(query, operationalKey),
    keyComparison: {
      operationalMatchesConnectionTest: sameAsConnection,
      operationalMatchesSecureStore: sameAsSecure,
      operationalMatchesFreshLoad: sameAsFresh,
      connectionTestEndpoint: connectionTestNewsUrl(connectionKey),
      noteJa,
    },
  };
}
