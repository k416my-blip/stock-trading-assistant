/**
 * コンシェルジュ実運用 — ニュース取得 + [NEWS_FETCH] / [NEWS_API_DEBUG]
 */
import type { StockFundamentals } from '../types';
import type { ConciergeFetchResultRow, ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { AnalysisApiKeys } from './analysisApiKeys';
import { orchestrateApiRequest } from './apiRequestOrchestrator';
import { recordNewsApiCall } from './apiCostTracker';
import { logNewsFetch, redactFetchUrl } from './conciergeOperationalFetchLog';
import { logNewsFetchTarget } from './conciergeTargetSymbolLog';
import { fetchConciergeRssNews } from './conciergeRssNewsProbe';
import {
  buildNewsApiDebugContext,
  buildOperationalNewsUrls,
  extractNewsApiErrorCode,
  extractNewsApiErrorMessage,
  logNewsApiDebug,
} from './newsApiFetchDebug';
import { resolveNewsApiKeyForOperational, type NewsApiKeyOrigin } from './newsApiKeyResolver';
import { getCachedNewsForSymbol, setCachedNewsForSymbol } from './newsCacheStorage';

const NEWS_API_TIMEOUT_MS = 10_000;

export type ConciergeNewsProvider = 'newsapi' | 'rss';

type NewsApiProbe = {
  status: number | string;
  articlesCount: number;
  error: string;
  requestUrl: string;
  endpoint: 'top-headlines' | 'everything';
  responseBody: unknown;
  headlines: ConciergeSymbolEvidence['latestFinancialNews'];
};

function titleSentiment(title: string): 'ポジティブ' | 'ネガティブ' | '中立' {
  const POSITIVE = /\b(surge|rally|beat|growth|profit|upgrade|record|strong|上昇|好調|増益)\b/i;
  const NEGATIVE = /\b(fall|drop|miss|loss|downgrade|weak|lawsuit|cut|下落|減益|訴訟)\b/i;
  if (POSITIVE.test(title)) return 'ポジティブ';
  if (NEGATIVE.test(title)) return 'ネガティブ';
  return '中立';
}

export function buildConciergeNewsQuery(stock: StockFundamentals, userMessage?: string): string {
  const msg = userMessage?.normalize('NFKC').trim() ?? '';
  if (msg && /maybank|マレー銀行/i.test(msg)) {
    return stock.name?.trim() || 'Malayan Banking Berhad';
  }
  return `${stock.name} ${stock.symbol}`.trim();
}

function buildNewsApiRequestUrl(
  query: string,
  apiKey: string,
  endpoint: 'top-headlines' | 'everything',
): string {
  const q = encodeURIComponent(query);
  const key = encodeURIComponent(apiKey.trim());
  if (endpoint === 'top-headlines') {
    return `https://newsapi.org/v2/top-headlines?q=${q}&language=en&pageSize=6&apiKey=${key}`;
  }
  return `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${key}`;
}

type NewsApiJson = {
  articles?: Array<{ title?: string }>;
  status?: string;
  code?: string;
  message?: string;
};

async function parseNewsResponse(res: Response): Promise<{ json: NewsApiJson; bodyText: string }> {
  const bodyText = await res.text();
  try {
    return { json: JSON.parse(bodyText) as NewsApiJson, bodyText };
  } catch {
    return { json: { message: bodyText.slice(0, 200) }, bodyText };
  }
}

function logNewsApiProbeDebug(input: {
  apiKey: string;
  apiKeyOrigin: NewsApiKeyOrigin;
  apiKeys: AnalysisApiKeys;
  query: string;
  endpoint: 'top-headlines' | 'everything';
  requestUrl: string;
  status: number | string;
  responseBody: unknown;
  articlesCount: number;
  error: string | null;
}): void {
  const fingerprint =
    input.apiKey.length > 8 ? `${input.apiKey.slice(0, 4)}…${input.apiKey.slice(-4)}` : null;
  const responseBodyCode = extractNewsApiErrorCode(input.responseBody);
  const responseBodyMessage = extractNewsApiErrorMessage(input.responseBody);
  void buildNewsApiDebugContext(input.apiKey, input.apiKeyOrigin, input.apiKeys, input.query).then(
    (debugCtx) => {
      logNewsApiDebug({
        apiKeyExists: Boolean(input.apiKey),
        apiKeyLength: input.apiKey.length,
        apiKeyOrigin: input.apiKeyOrigin,
        apiKeyFingerprint: fingerprint,
        endpoint: input.endpoint,
        status: input.status,
        responseBodyCode,
        responseBodyMessage,
        requestUrl: redactFetchUrl(input.requestUrl),
        operationalUrls: debugCtx.operationalUrls,
        articlesCount: input.articlesCount,
        responseBody: input.responseBody,
        error: input.error,
        keySources: debugCtx.keySources,
        keyComparison: debugCtx.keyComparison,
      });
    },
  );
}

async function probeNewsApiEndpoint(input: {
  stock: StockFundamentals;
  apiKey: string;
  apiKeyOrigin: NewsApiKeyOrigin;
  apiKeys: AnalysisApiKeys;
  endpoint: 'top-headlines' | 'everything';
  userMessage?: string;
}): Promise<NewsApiProbe> {
  const query = buildConciergeNewsQuery(input.stock, input.userMessage);
  const requestUrl = buildNewsApiRequestUrl(query, input.apiKey, input.endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_API_TIMEOUT_MS);

  try {
    const res = await fetch(requestUrl, { signal: controller.signal });
    const status = res.status;
    const { json, bodyText } = await parseNewsResponse(res);
    const articles = json.articles ?? [];
    const titles = articles
      .map((a) => a.title?.trim())
      .filter((t): t is string => Boolean(t));

    if (!res.ok) {
      const detail =
        json.code && json.message
          ? `${json.code}: ${json.message}`
          : json.message ?? res.statusText ?? 'HTTP error';
      const error = `${status} ${detail}`.trim();
      logNewsApiProbeDebug({
        apiKey: input.apiKey,
        apiKeyOrigin: input.apiKeyOrigin,
        apiKeys: input.apiKeys,
        query,
        endpoint: input.endpoint,
        requestUrl,
        status,
        responseBody: json.status ? json : bodyText.slice(0, 500),
        articlesCount: 0,
        error,
      });
      return {
        status,
        articlesCount: 0,
        error,
        requestUrl,
        endpoint: input.endpoint,
        responseBody: json,
        headlines: [],
      };
    }

    const fetchedAtIso = new Date().toISOString();
    const headlines = titles.slice(0, 6).map((title) => ({
      title,
      sentiment: titleSentiment(title),
      fetchedAtIso,
      ageSeconds: 0,
    }));

    const error = headlines.length === 0 ? '0 articles returned' : '';
    logNewsApiProbeDebug({
      apiKey: input.apiKey,
      apiKeyOrigin: input.apiKeyOrigin,
      apiKeys: input.apiKeys,
      query,
      endpoint: input.endpoint,
      requestUrl,
      status,
      responseBody: json,
      articlesCount: headlines.length,
      error: error || null,
    });

    return {
      status,
      articlesCount: headlines.length,
      error,
      requestUrl,
      endpoint: input.endpoint,
      responseBody: json,
      headlines,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isAbort = e instanceof Error && e.name === 'AbortError';
    const status = isAbort ? 'timeout' : 'fetch_error';
    const error = isAbort ? 'request timeout' : msg;
    logNewsApiProbeDebug({
      apiKey: input.apiKey,
      apiKeyOrigin: input.apiKeyOrigin,
      apiKeys: input.apiKeys,
      query,
      endpoint: input.endpoint,
      requestUrl,
      status,
      responseBody: { error: msg },
      articlesCount: 0,
      error,
    });
    return {
      status,
      articlesCount: 0,
      error,
      requestUrl,
      endpoint: input.endpoint,
      responseBody: { error: msg },
      headlines: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

function newsRow(
  ok: boolean,
  headlineCount: number,
  newsSource: string,
  options: {
    provider?: ConciergeNewsProvider;
    fromCache?: boolean;
    newsApiError?: string;
    failError?: string;
  } = {},
): ConciergeFetchResultRow {
  const { provider, fromCache, newsApiError, failError } = options;
  const via = provider === 'rss' ? 'RSS' : 'NewsAPI';
  let detailJa = `${headlineCount}件 · ${via} · ${newsSource}`;
  if (fromCache) detailJa += '（キャッシュ）';
  if (newsApiError && ok && provider === 'rss') {
    detailJa += ` · NewsAPI失敗: ${newsApiError}`;
  }
  return {
    source: 'newsapi',
    ok,
    provider: provider ?? (ok ? 'newsapi' : undefined),
    detailJa,
    headlineCount,
    error: ok ? undefined : failError ?? newsApiError ?? '0 articles returned',
  };
}

export async function fetchConciergeNewsEvidence(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
  userMessage?: string,
  options?: { source?: 'chat' | 'proactive' | 'allocation' },
): Promise<{
  headlines: ConciergeSymbolEvidence['latestFinancialNews'];
  newsSummaryJa: string;
  newsSource: string;
  fromCache: boolean;
  row: ConciergeFetchResultRow;
}> {
  const query = buildConciergeNewsQuery(stock, userMessage);
  const source = options?.source ?? 'chat';
  logNewsFetchTarget({ symbol: stock.symbol, query, source });

  const cached = await getCachedNewsForSymbol(stock.market, stock.symbol);
  if (cached) {
    const articlesCount = cached.headlines.length;
    const isRss = /rss|yahoo|google|bursa/i.test(cached.newsSource);
    const error = articlesCount === 0 ? '0 articles in cache' : undefined;
    logNewsFetch({
      symbol: stock.symbol,
      query,
      requestUrl: '(cache)',
      status: 'cache',
      articlesCount,
      error,
    });
    return {
      headlines: cached.headlines,
      newsSummaryJa: cached.newsSummaryJa,
      newsSource: `${cached.newsSource}（キャッシュ30分）`,
      fromCache: true,
      row: newsRow(articlesCount > 0, articlesCount, cached.newsSource, {
        provider: isRss ? 'rss' : 'newsapi',
        fromCache: true,
        failError: error,
      }),
    };
  }

  const { key: newsKey, origin: keyOrigin } = await resolveNewsApiKeyForOperational(apiKeys);

  let requestUrl = '';
  let status: number | string = 'no_attempt';
  let newsApiError = '';
  let headlines: ConciergeSymbolEvidence['latestFinancialNews'] = [];
  let newsSummaryJa = '';
  let newsSource = '';
  let newsProvider: ConciergeNewsProvider = 'newsapi';

  if (!newsKey) {
    requestUrl = '(newsapi-key-missing)';
    status = 'no_key';
    newsApiError = 'NewsAPI key missing (SecureStore / state / .env すべて空)';
    const debugCtx = await buildNewsApiDebugContext('', 'missing', apiKeys, query);
    logNewsApiDebug({
      apiKeyExists: false,
      apiKeyLength: 0,
      apiKeyOrigin: 'missing',
      apiKeyFingerprint: null,
      endpoint: 'top-headlines',
      status,
      responseBodyCode: null,
      responseBodyMessage: null,
      requestUrl,
      operationalUrls: debugCtx.operationalUrls,
      articlesCount: 0,
      responseBody: null,
      error: newsApiError,
      keySources: debugCtx.keySources,
      keyComparison: debugCtx.keyComparison,
    });
  } else {
    const operationalUrls = buildOperationalNewsUrls(query, newsKey);
    console.warn('[NEWS_API_DEBUG] operationalUrls', JSON.stringify(operationalUrls));

    const dedupeKey = `news-probe:${stock.market}:${stock.symbol.toUpperCase()}`;
    const probe = await orchestrateApiRequest(dedupeKey, async () => {
      const top = await probeNewsApiEndpoint({
        stock,
        apiKey: newsKey,
        apiKeyOrigin: keyOrigin,
        apiKeys,
        endpoint: 'top-headlines',
        userMessage,
      });
      if (top.headlines.length > 0) return top;
      const code = extractNewsApiErrorCode(top.responseBody);
      if (code === 'upgradeRequired' || top.status === 426) {
        return top;
      }
      return probeNewsApiEndpoint({
        stock,
        apiKey: newsKey,
        apiKeyOrigin: keyOrigin,
        apiKeys,
        endpoint: 'everything',
        userMessage,
      });
    });
    recordNewsApiCall(1);
    requestUrl = redactFetchUrl(probe.requestUrl);
    status = probe.status;
    newsApiError = probe.error;
    headlines = probe.headlines;
    if (headlines.length > 0) {
      newsSummaryJa = `ニュース評価（NewsAPI ${headlines.length}件 · ${probe.endpoint}）`;
      newsSource = 'NewsAPI';
      newsProvider = 'newsapi';
    }
  }

  if (headlines.length === 0) {
    const rss = await fetchConciergeRssNews(stock);
    requestUrl = requestUrl
      ? `${requestUrl} → yahoo|google|bursa-rss`
      : 'yahoo|google|bursa-rss';
    if (rss.headlines.length > 0) {
      status = status === 'no_attempt' || status === 'no_key' ? 'rss_ok' : `${status}+rss`;
      headlines = rss.headlines;
      newsSummaryJa = rss.summaryJa;
      newsSource = rss.primarySource;
      newsProvider = 'rss';
    } else if (!newsApiError) {
      newsApiError = '0 articles returned';
    } else {
      newsApiError = `${newsApiError}; RSS fallback 0 articles`;
    }
  }

  logNewsFetch({
    symbol: stock.symbol,
    query,
    requestUrl,
    status,
    articlesCount: headlines.length,
    error: headlines.length === 0 ? newsApiError || '0 articles returned' : undefined,
  });

  if (headlines.length > 0) {
    await setCachedNewsForSymbol({
      symbol: stock.symbol,
      market: stock.market,
      headlines,
      newsSummaryJa,
      newsSource,
    });
  }

  const ok = headlines.length > 0;
  return {
    headlines,
    newsSummaryJa: newsSummaryJa || 'ニュースデータ未取得',
    newsSource: newsSource || '未取得',
    fromCache: false,
    row: newsRow(ok, headlines.length, newsSource || '未取得', {
      provider: newsProvider,
      newsApiError: newsProvider === 'rss' && newsApiError ? newsApiError : undefined,
      failError: ok ? undefined : newsApiError || '0 articles returned',
    }),
  };
}
