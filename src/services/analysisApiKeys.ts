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
  /** Phase14 — Alpha Vantage（optional） */
  alphaVantageApiKey?: string;
  /** Phase14 — FMP（optional） */
  fmpApiKey?: string;
}

const EMPTY: AnalysisApiKeys = {
  newsApiKey: '',
  snsApiKey: '',
  earningsApiKey: '',
  redditApiKey: '',
  xApiKey: '',
  alphaVantageApiKey: '',
  fmpApiKey: '',
};

const NEWS_ENV = ['EXPO_PUBLIC_NEWS_API_KEY', 'NEWS_API_KEY'] as const;
const ALPHA_ENV = ['ALPHA_VANTAGE_API_KEY', 'EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY'] as const;
const FMP_ENV = ['FMP_API_KEY', 'EXPO_PUBLIC_FMP_API_KEY'] as const;
const FINNHUB_ENV = ['FINNHUB_API_KEY', 'EARNINGS_API_KEY', 'EXPO_PUBLIC_EARNINGS_API_KEY'] as const;

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
    const [news, sns, earnings, reddit, x, alpha, fmp, finnhub] = await Promise.all([
      getSecret('newsApiKey'),
      getSecret('snsApiKey'),
      getSecret('earningsApiKey'),
      getSecret('redditApiKey'),
      getSecret('xApiKey'),
      getSecret('alphaVantageApiKey'),
      getSecret('fmpApiKey'),
      getSecret('finnhubApiKey'),
    ]);
    const newsApiKey = isUsableApiKey(news) ? news.trim() : readEnvKey(NEWS_ENV);
    const xFromStore = isUsableApiKey(x) ? x.trim() : '';
    const xFromEnv = readXBearerFromEnv();
    const xApiKey = xFromStore || xFromEnv;
    const snsApiKey = isUsableApiKey(sns) ? sns.trim() : xApiKey;
    const earningsFromStore = isUsableApiKey(earnings)
      ? earnings.trim()
      : isUsableApiKey(finnhub)
        ? finnhub.trim()
        : readEnvKey(FINNHUB_ENV);
    return {
      newsApiKey,
      snsApiKey,
      earningsApiKey: earningsFromStore,
      redditApiKey: isUsableApiKey(reddit) ? reddit.trim() : '',
      xApiKey,
      alphaVantageApiKey: isUsableApiKey(alpha) ? alpha.trim() : readEnvKey(ALPHA_ENV),
      fmpApiKey: isUsableApiKey(fmp) ? fmp.trim() : readEnvKey(FMP_ENV),
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
