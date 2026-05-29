import { getSecret, setSecret } from './secretStorage';
import { isUsableApiKey } from './apiKeyValidation';
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
      redditApiKey: isUsableApiKey(reddit) ? reddit.trim() : snsApiKey,
      xApiKey,
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveAnalysisApiKeys(keys: Partial<AnalysisApiKeys>): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (keys.newsApiKey !== undefined) {
    tasks.push(setSecret('newsApiKey', keys.newsApiKey));
  }
  if (keys.snsApiKey !== undefined) {
    tasks.push(setSecret('snsApiKey', keys.snsApiKey));
  }
  if (keys.earningsApiKey !== undefined) {
    tasks.push(setSecret('earningsApiKey', keys.earningsApiKey));
  }
  if (keys.redditApiKey !== undefined) {
    tasks.push(setSecret('redditApiKey', keys.redditApiKey));
  }
  if (keys.xApiKey !== undefined) {
    tasks.push(setSecret('xApiKey', keys.xApiKey));
  }
  await Promise.all(tasks);
}
