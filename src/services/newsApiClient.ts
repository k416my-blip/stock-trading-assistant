/**
 * NewsAPI 共通クライアント — X-Api-Key ヘッダー + top-headlines 優先
 * Developer プランでは /everything は localhost 限定のため実機では top-headlines を使う。
 */
import {
  isNewsApiTempRateLimit,
  NEWSAPI_TEMP_RATE_LIMIT,
} from '../constants/newsApiRateLimit';
import {
  buildNewsApiAuthHeaders,
  getAdoptedNewsApiAuthMode,
  type NewsApiAuthMode,
} from './newsApiConnectionDebug';

export type NewsApiEndpoint = 'top-headlines' | 'everything';

export type NewsApiJsonBody = {
  status?: string;
  code?: string;
  message?: string;
  articles?: Array<{ title?: string; url?: string; publishedAt?: string }>;
};

const NEWS_API_BASE = 'https://newsapi.org/v2';

export function buildNewsApiPath(
  endpoint: NewsApiEndpoint,
  queryParams: Record<string, string>,
): string {
  const qs = new URLSearchParams(queryParams).toString();
  return `${NEWS_API_BASE}/${endpoint}${qs ? `?${qs}` : ''}`;
}

export function isNewsApiEverythingBlockedOnDevice(
  code: string | null | undefined,
  message?: string | null,
): boolean {
  if (code === 'upgradeRequired') return true;
  const msg = message ?? '';
  if (/localhost|development environment only|not available on your plan/i.test(msg)) return true;
  return false;
}

export async function fetchNewsApi(
  endpoint: NewsApiEndpoint,
  queryParams: Record<string, string>,
  apiKey: string,
  timeoutMs = 12_000,
  authMode?: NewsApiAuthMode,
): Promise<{
  url: string;
  status: number;
  bodyText: string;
  json: NewsApiJsonBody;
  ok: boolean;
  authMode: NewsApiAuthMode;
}> {
  const url = buildNewsApiPath(endpoint, queryParams);
  const modes: NewsApiAuthMode[] = authMode
    ? [authMode]
    : [getAdoptedNewsApiAuthMode(), 'x-api-key', 'authorization-bearer'].filter(
        (m, i, arr) => arr.indexOf(m) === i,
      );

  let last: {
    url: string;
    status: number;
    bodyText: string;
    json: NewsApiJsonBody;
    ok: boolean;
    authMode: NewsApiAuthMode;
  } | null = null;

  for (const mode of modes) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: buildNewsApiAuthHeaders(apiKey, mode),
      });
      const bodyText = await res.text();
      let json: NewsApiJsonBody = {};
      try {
        json = JSON.parse(bodyText) as NewsApiJsonBody;
      } catch {
        json = { message: bodyText.slice(0, 200) };
      }
      const ok = res.ok && json.status !== 'error';
      const result = { url, status: res.status, bodyText, json, ok, authMode: mode };
      last = result;
      if (ok) return result;
      if (json.code === 'apiKeyInvalid' || res.status === 401) continue;
      if (!ok && res.status >= 400) return result;
    } catch (e) {
      last = {
        url,
        status: 0,
        bodyText: e instanceof Error ? e.message : String(e),
        json: {},
        ok: false,
        authMode: mode,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return (
    last ?? {
      url,
      status: 0,
      bodyText: '',
      json: {},
      ok: false,
      authMode: modes[0] ?? 'x-api-key',
    }
  );
}

export type NewsApiFetchWithFallbackResult = {
  endpoint: NewsApiEndpoint;
  articles: NonNullable<NewsApiJsonBody['articles']>;
  titles: string[];
  status: number;
  bodyText: string;
  json: NewsApiJsonBody;
  ok: boolean;
  errorReason: string | null;
  tempRateLimit: boolean;
};

function titlesFromArticles(articles: NewsApiJsonBody['articles']): string[] {
  return (articles ?? [])
    .map((a) => a.title?.trim())
    .filter((t): t is string => Boolean(t));
}

function toFallbackResult(
  endpoint: NewsApiEndpoint,
  fetched: Awaited<ReturnType<typeof fetchNewsApi>>,
  overrides: Partial<NewsApiFetchWithFallbackResult> = {},
): NewsApiFetchWithFallbackResult {
  const titles = titlesFromArticles(fetched.json.articles);
  return {
    endpoint,
    articles: fetched.json.articles ?? [],
    titles,
    status: fetched.status,
    bodyText: fetched.bodyText,
    json: fetched.json,
    ok: overrides.ok ?? (fetched.ok && titles.length > 0),
    errorReason: overrides.errorReason ?? null,
    tempRateLimit: overrides.tempRateLimit ?? false,
  };
}

/** 実機向け — Stage A (country=us) → everything の順で試行 */
export async function fetchNewsApiWithFallback(
  query: string,
  apiKey: string,
  pageSize: number,
  timeoutMs = 12_000,
): Promise<NewsApiFetchWithFallbackResult> {
  const stageA = await fetchNewsApi(
    'top-headlines',
    { country: 'us', pageSize: String(pageSize) },
    apiKey,
    timeoutMs,
  );
  const stageATitles = titlesFromArticles(stageA.json.articles);

  if (stageA.ok && stageATitles.length > 0) {
    return toFallbackResult('top-headlines', stageA, { ok: true });
  }

  if (
    isNewsApiTempRateLimit({
      httpStatus: stageA.status,
      responseBody: stageA.bodyText,
      errorCode: stageA.json.code,
    })
  ) {
    return toFallbackResult('top-headlines', stageA, {
      ok: true,
      tempRateLimit: true,
      errorReason: NEWSAPI_TEMP_RATE_LIMIT,
    });
  }

  if (stageA.json.code === 'apiKeyInvalid' || stageA.status === 401 || stageA.status === 403) {
    return toFallbackResult('top-headlines', stageA, {
      ok: false,
      errorReason: stageA.json.message ?? 'APIキー無効',
    });
  }

  const q = query.trim();
  const everything = await fetchNewsApi(
    'everything',
    { q, language: 'en', pageSize: String(pageSize), sortBy: 'publishedAt' },
    apiKey,
    timeoutMs,
  );
  const evTitles = titlesFromArticles(everything.json.articles);

  if (everything.ok && evTitles.length > 0) {
    return toFallbackResult('everything', everything, { ok: true });
  }

  if (
    isNewsApiTempRateLimit({
      httpStatus: everything.status,
      responseBody: everything.bodyText,
      errorCode: everything.json.code,
    })
  ) {
    return toFallbackResult('everything', everything, {
      ok: true,
      tempRateLimit: true,
      errorReason: NEWSAPI_TEMP_RATE_LIMIT,
    });
  }

  const code = everything.json.code ?? stageA.json.code ?? null;
  const message = everything.json.message ?? stageA.json.message ?? null;

  if (isNewsApiEverythingBlockedOnDevice(code, message) && stageA.status > 0) {
    const topMsg = stageA.json.message ?? `HTTP ${stageA.status}`;
    return toFallbackResult('top-headlines', stageA, {
      ok: false,
      errorReason: stageATitles.length === 0 ? `記事0件 · ${topMsg}` : topMsg,
    });
  }

  return toFallbackResult(
    everything.status ? 'everything' : 'top-headlines',
    everything.status ? everything : stageA,
    {
      ok: false,
      errorReason: message ?? `HTTP ${everything.status || stageA.status}`,
    },
  );
}
