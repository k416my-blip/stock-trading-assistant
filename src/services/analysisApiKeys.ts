import { getSecret, setSecret } from './secretStorage';

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

export async function loadAnalysisApiKeys(): Promise<AnalysisApiKeys> {
  try {
    const [news, sns, earnings, reddit, x] = await Promise.all([
      getSecret('newsApiKey'),
      getSecret('snsApiKey'),
      getSecret('earningsApiKey'),
      getSecret('redditApiKey'),
      getSecret('xApiKey'),
    ]);
    return {
      newsApiKey: news,
      snsApiKey: sns,
      earningsApiKey: earnings,
      redditApiKey: reddit.trim() || sns.trim(),
      xApiKey: x,
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
