/**
 * NewsAPI キー解決 — SecureStore / .env / React state の切り分け
 */
import type { AnalysisApiKeys } from './analysisApiKeys';
import { loadAnalysisApiKeys } from './analysisApiKeys';
import { normalizeStoredApiKey, isUsableApiKey } from './apiKeyValidation';
import { loadApiKey } from './apiKeys';
import { getSecret } from './secretStorage';
import { redactFetchUrl } from './conciergeOperationalFetchLog';

const NEWS_ENV = ['EXPO_PUBLIC_NEWS_API_KEY', 'NEWS_API_KEY'] as const;

export type NewsApiKeyOrigin =
  | 'secure_store'
  | 'env'
  | 'react_state'
  | 'fallback'
  | 'mock'
  | 'missing';

export type NewsApiKeySlot = {
  origin: NewsApiKeyOrigin;
  exists: boolean;
  length: number;
  /** 先頭4+末尾4（キー本体はログに出さない） */
  fingerprint: string | null;
};

function readEnvNewsKey(): string {
  if (typeof process === 'undefined' || !process.env) return '';
  for (const name of NEWS_ENV) {
    const v = process.env[name]?.trim();
    if (v && isUsableApiKey(v)) return normalizeStoredApiKey(v);
  }
  return '';
}

function fingerprint(key: string): string | null {
  if (!key) return null;
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function slotFromKey(key: string, origin: NewsApiKeyOrigin): NewsApiKeySlot {
  const normalized = normalizeStoredApiKey(key);
  const exists = isUsableApiKey(normalized);
  const lower = normalized.toLowerCase();
  const isMock =
    !exists ||
    lower.includes('mock') ||
    lower === 'test' ||
    /^x{8,}$/i.test(normalized);
  return {
    origin: isMock ? 'mock' : origin,
    exists,
    length: exists ? normalized.length : 0,
    fingerprint: exists ? fingerprint(normalized) : null,
  };
}

export async function readSecureStoreNewsKey(): Promise<string> {
  const raw = await getSecret('newsApiKey');
  return isUsableApiKey(raw) ? normalizeStoredApiKey(raw) : '';
}

export async function inspectNewsApiKeySources(
  stateNewsKey?: string,
): Promise<{
  secureStore: NewsApiKeySlot;
  env: NewsApiKeySlot;
  reactState: NewsApiKeySlot;
  connectionTestLoad: NewsApiKeySlot;
  freshAnalysisLoad: NewsApiKeySlot;
}> {
  const [secureRaw, connectionKey, freshAnalysis] = await Promise.all([
    readSecureStoreNewsKey(),
    loadApiKey('newsapi'),
    loadAnalysisApiKeys(),
  ]);
  const envKey = readEnvNewsKey();

  return {
    secureStore: slotFromKey(secureRaw, 'secure_store'),
    env: slotFromKey(envKey, 'env'),
    reactState: slotFromKey(stateNewsKey ?? '', 'react_state'),
    connectionTestLoad: slotFromKey(connectionKey, 'secure_store'),
    freshAnalysisLoad: slotFromKey(freshAnalysis.newsApiKey, 'secure_store'),
  };
}

/**
 * 実運用（コンシェルジュ）— 保存済み SecureStore を state より優先
 */
export async function resolveNewsApiKeyForOperational(
  stateKeys: AnalysisApiKeys,
): Promise<{ key: string; origin: NewsApiKeyOrigin }> {
  const secure = await readSecureStoreNewsKey();
  if (secure) return { key: secure, origin: 'secure_store' };

  const stateKey = normalizeStoredApiKey(stateKeys.newsApiKey);
  if (isUsableApiKey(stateKey)) return { key: stateKey, origin: 'react_state' };

  const envKey = readEnvNewsKey();
  if (envKey) return { key: envKey, origin: 'env' };

  return { key: '', origin: 'missing' };
}

export function keysMatch(a: string, b: string): boolean {
  const na = normalizeStoredApiKey(a);
  const nb = normalizeStoredApiKey(b);
  if (!na || !nb) return false;
  return na === nb;
}

export function connectionTestNewsUrl(apiKey: string): string {
  return redactFetchUrl(
    `https://newsapi.org/v2/top-headlines?category=business&country=us&pageSize=1&apiKey=${encodeURIComponent(apiKey)}`,
  );
}

export function operationalNewsUrl(apiKey: string, query: string, endpoint: 'top-headlines' | 'everything'): string {
  const q = encodeURIComponent(query);
  if (endpoint === 'top-headlines') {
    return redactFetchUrl(
      `https://newsapi.org/v2/top-headlines?q=${q}&language=en&pageSize=6&apiKey=${encodeURIComponent(apiKey)}`,
    );
  }
  return redactFetchUrl(
    `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${encodeURIComponent(apiKey)}`,
  );
}
