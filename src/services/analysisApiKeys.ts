import { getSecret } from './secretStorage';
import { canPersistApiKeyValue, isUsableApiKey } from './apiKeyValidation';
import { safeSaveSecretById } from './safeApiKey';
import { readXBearerFromEnv } from './xBearerToken';

export interface AnalysisApiKeys {
  newsApiKey: string;
  snsApiKey: string;
  earningsApiKey: string;
  redditApiKey: string;
  xApiKey: string;
}

const EMPTY: AnalysisApiKeys = {
  newsApiKey: '',
  snsApiKey: '',
  earningsApiKey: '',
  redditApiKey: '',
  xApiKey: '',
};

const NEWS_ENV = ['EXPO_PUBLIC_NEWS_API_KEY', 'NEWS_API_KEY'] as const;

function readEnvKey(names: readonly string[]): string {
  if (typeof process === 'undefined' || !process.env) return '';
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v && isUsableApiKey(v)) return v;
  }
  return '';
}

export async function loadAnalysisApiKeys(): Promise<AnalysisApiKeys> {
  try {
    const [news, sns, earnings, reddit, x] = await Promise.all([
      getSecret('newsApiKey'),
      getSecret('snsApiKey'),
      getSecret('earningsApiKey'),
      getSecret('redditApiKey'),
      getSecret('xApiKey'),
    ]);
    const newsApiKey = isUsableApiKey(news) ? news.trim() : readEnvKey(NEWS_ENV);
    const xFromStore = isUsableApiKey(x) ? x.trim() : '';
    const xFromEnv = readXBearerFromEnv();
    const xApiKey = xFromStore || xFromEnv;
    const snsApiKey = isUsableApiKey(sns) ? sns.trim() : xApiKey;
    return {
      newsApiKey,
      snsApiKey,
      earningsApiKey: isUsableApiKey(earnings) ? earnings.trim() : '',
      redditApiKey: isUsableApiKey(reddit) ? reddit.trim() : '',
      xApiKey,
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveAnalysisApiKeys(
  keys: Partial<AnalysisApiKeys>,
): Promise<{ savedFields: string[]; skippedFields: string[] }> {
  const savedFields: string[] = [];
  const skippedFields: string[] = [];
  const entries: Array<[keyof AnalysisApiKeys, 'newsApiKey' | 'snsApiKey' | 'earningsApiKey' | 'redditApiKey' | 'xApiKey']> = [
    ['newsApiKey', 'newsApiKey'],
    ['snsApiKey', 'snsApiKey'],
    ['earningsApiKey', 'earningsApiKey'],
    ['redditApiKey', 'redditApiKey'],
    ['xApiKey', 'xApiKey'],
  ];
  for (const [field, secretId] of entries) {
    if (keys[field] === undefined) continue;
    const value = keys[field] ?? '';
    if (!canPersistApiKeyValue(value)) {
      skippedFields.push(field);
      continue;
    }
    const res = await safeSaveSecretById(secretId, value);
    if (res.saved) savedFields.push(field);
    else skippedFields.push(field);
  }
  return { savedFields, skippedFields };
}
