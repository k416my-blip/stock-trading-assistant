/**
 * X API v2 — Bearer Token · センチメント分析用投稿取得
 * リアルタイム監視なし。ユーザー要求時のみ。
 */
import {
  X_API_BASE,
  X_FETCH_MAX_RETRIES,
  X_FETCH_RETRY_DELAY_MS,
  X_FETCH_TIMEOUT_MS,
  X_SEARCH_MAX_RESULTS,
} from '../constants/xApiConservation';
import type { Market, StockFundamentals } from '../types';
import type { SnsAnalysisResult } from '../types/recommendation';
import type { XApiFetchResult, XPostsFetchResult, XSymbolCacheEntry } from '../types/xApi';
import type { XRawPost, XSentimentSnapshot } from '../types/xSentiment';
import { findStock } from '../data/sampleStocks';
import { getCachedXSymbolInsight, setCachedXSymbolInsight } from './xApiCacheStorage';
import { recordXApiUsage, getXApiUsageDashboard } from './xApiUsageStorage';
import {
  buildXAuthorizationHeader,
  normalizeBearerToken,
  resolveXBearerToken,
  validateAuthorizationHeaderFormat,
} from './xBearerToken';
import {
  isXHttpTerminalError,
  xHttpStatusDiagnosisJa,
  xHttpStatusUserMessageJa,
} from './xHttpStatus';
import { isXPaidSearchAllowed, recordXApiPaymentRequired } from './xApiOptionalModeStorage';
import {
  analyzePostsSentiment,
  buildXSearchQuery,
  sentimentSnapshotToLegacyRates,
} from './xSentimentEngine';

export { buildXSearchQuery };

type TwitterSearchResponse = {
  data?: Array<{ text?: string; created_at?: string }>;
  errors?: Array<{ detail?: string }>;
};

async function fetchRecentSearchOnce(
  bearerToken: string,
  query: string,
  timeoutMs: number,
): Promise<{ posts: XRawPost[]; error?: string; httpStatus?: number }> {
  const url = new URL(`${X_API_BASE}/tweets/search/recent`);
  url.searchParams.set('query', query);
  url.searchParams.set('max_results', String(X_SEARCH_MAX_RESULTS));
  url.searchParams.set('tweet.fields', 'created_at,lang,public_metrics');

  const auth = buildXAuthorizationHeader(bearerToken);
  console.log('[x-api] AUTH_HEADER_CHECK', validateAuthorizationHeaderFormat(auth.Authorization));
  console.log('[x-api] FETCH_BEFORE', {
    query,
    url: url.toString(),
    timeoutMs,
    authHeaderPreview: `Bearer ${normalizeBearerToken(bearerToken).slice(0, 5)}…`,
    tokenLength: normalizeBearerToken(bearerToken).length,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: auth,
      signal: controller.signal,
    });
    const bodyText = await res.text();
    console.log('[x-api] FETCH_AFTER', {
      query,
      status: res.status,
      responseBody: bodyText,
    });

    if (!res.ok) {
      return {
        posts: [],
        error: xHttpStatusDiagnosisJa(res.status),
        httpStatus: res.status,
      };
    }

    let json: TwitterSearchResponse;
    try {
      json = JSON.parse(bodyText) as TwitterSearchResponse;
    } catch {
      return { posts: [], error: 'X APIレスポンス解析失敗' };
    }

    if (json.errors?.length) {
      return { posts: [], error: json.errors[0]?.detail ?? 'X APIエラー' };
    }

    const posts: XRawPost[] = (json.data ?? [])
      .map((t) => ({
        text: typeof t.text === 'string' ? t.text : '',
        createdAt: t.created_at,
      }))
      .filter((p) => p.text.length > 0);
    return { posts };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return { posts: [], error: isTimeout ? 'X APIタイムアウト' : msg };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRecentSearchWithLimitedRetry(
  bearerToken: string,
  query: string,
): Promise<{ posts: XRawPost[]; error?: string; httpStatus?: number }> {
  let lastError: string | undefined;
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt <= X_FETCH_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, X_FETCH_RETRY_DELAY_MS));
    }
    const result = await fetchRecentSearchOnce(bearerToken, query, X_FETCH_TIMEOUT_MS);
    if (result.posts.length > 0 || !result.error) {
      return result;
    }
    lastError = result.error;
    lastStatus = result.httpStatus;
    if (result.httpStatus === 402) {
      await recordXApiPaymentRequired();
    }
    if (result.httpStatus != null && isXHttpTerminalError(result.httpStatus)) {
      break;
    }
  }
  return {
    posts: [],
    error: lastError ?? 'X API取得失敗',
    httpStatus: lastStatus,
  };
}

export type FetchXInsightInput = {
  symbol: string;
  market: Market;
  bearerToken: string;
  companyName?: string;
  forceRefresh?: boolean;
};

/** @deprecated fetchXPostsForStock を使用 */
export async function fetchXInsightForSymbol(
  input: FetchXInsightInput,
): Promise<XApiFetchResult> {
  const stock =
    findStock(input.symbol) ??
    ({
      symbol: input.symbol,
      name: input.companyName ?? input.symbol,
      market: input.market,
      currency: 'MYR' as const,
      price: 0,
      dividendYield: 0,
      per: 0,
      marketCap: 0,
      volume: 0,
      category: 'growth' as const,
    } satisfies StockFundamentals);

  const posts = await fetchXPostsForStock(stock, input.bearerToken, input.forceRefresh);
  if (posts.ok && posts.snapshot) {
    const legacy = sentimentSnapshotToLegacyRates(posts.snapshot.sentimentPct);
    return {
      ok: true,
      cacheHit: posts.cacheHit,
      entry: {
        symbol: input.symbol,
        market: input.market,
        companyName: input.companyName,
        fetchedAt: posts.snapshot.fetchedAt,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        postCount: posts.snapshot.postCount,
        summaryJa: posts.snapshot.summaryJa,
        buzzScore: posts.snapshot.buzzScore,
        positiveRatePct: legacy.positiveRatePct,
        negativeRatePct: legacy.negativeRatePct,
        fromCache: posts.snapshot.fromCache,
        sentiment: posts.snapshot,
        searchQuery: posts.snapshot.searchQuery,
      },
    };
  }
  return {
    ok: false,
    cacheHit: posts.cacheHit,
    entry: null,
    errorJa: posts.errorJa,
    skippedReason: posts.skippedReason,
    httpStatus: posts.httpStatus,
  };
}

/** ユーザー要求時 — 投稿取得 + ルールベースセンチメント */
export async function fetchXPostsForStock(
  stock: StockFundamentals,
  bearerToken: string,
  forceRefresh = false,
): Promise<XPostsFetchResult> {
  const token = resolveXBearerToken(bearerToken);
  if (!token) {
    return {
      ok: false,
      cacheHit: false,
      snapshot: null,
      errorJa: 'X API未設定',
      skippedReason: 'no_key',
    };
  }

  const paidGate = await isXPaidSearchAllowed();
  if (!paidGate.allowed) {
    return {
      ok: false,
      cacheHit: false,
      snapshot: null,
      errorJa: paidGate.reasonJa ?? 'X APIの有料機能は無効です',
      skippedReason: paidGate.reasonJa?.includes('optional') ? 'optional_mode' : 'payment_required',
    };
  }

  const prior = await getCachedXSymbolInsight(stock.market, stock.symbol);
  if (!forceRefresh && prior?.sentiment) {
    return {
      ok: true,
      cacheHit: true,
      snapshot: { ...prior.sentiment, fromCache: true },
    };
  }

  const companyName = stock.name?.trim() || findStock(stock.symbol)?.name;
  const query = buildXSearchQuery(stock.symbol, companyName);
  const { posts, error, httpStatus } = await fetchRecentSearchWithLimitedRetry(token, query);

  if (error && posts.length === 0) {
    if (httpStatus === 402) {
      await recordXApiPaymentRequired();
    }
    return {
      ok: false,
      cacheHit: false,
      snapshot: null,
      errorJa: httpStatus != null ? xHttpStatusUserMessageJa(httpStatus) : error,
      skippedReason: httpStatus === 402 ? 'payment_required' : 'disabled',
      httpStatus,
    };
  }

  await recordXApiUsage('search');
  const quota = await getXApiUsageDashboard();
  const snapshot = analyzePostsSentiment({
    posts,
    searchQuery: query,
    previousPostCount: prior?.postCount ?? null,
    quotaRemainingToday: quota.remainingToday,
    fromCache: false,
    fetchedAt: new Date().toISOString(),
  });

  const legacy = sentimentSnapshotToLegacyRates(snapshot.sentimentPct);
  await setCachedXSymbolInsight({
    symbol: stock.symbol,
    market: stock.market,
    companyName,
    fetchedAt: snapshot.fetchedAt,
    postCount: snapshot.postCount,
    summaryJa: snapshot.summaryJa,
    buzzScore: snapshot.buzzScore,
    positiveRatePct: legacy.positiveRatePct,
    negativeRatePct: legacy.negativeRatePct,
    sentiment: snapshot,
    previousPostCount: prior?.postCount,
    searchQuery: query,
  });

  return { ok: true, cacheHit: false, snapshot };
}

export function xCacheEntryToSnsResult(entry: XSymbolCacheEntry): SnsAnalysisResult {
  const SNS_WARNING = 'SNSの話題性は短期的に大きく変わります。参考程度に留めてください。';
  if (entry.sentiment) {
    const legacy = sentimentSnapshotToLegacyRates(entry.sentiment.sentimentPct);
    const score = Math.round(
      entry.buzzScore * 0.35 + legacy.positiveRatePct * 0.45 + (100 - legacy.negativeRatePct) * 0.2,
    );
    return {
      score: Math.max(0, Math.min(100, score)),
      buzzScore: entry.buzzScore,
      positiveRatePct: legacy.positiveRatePct,
      negativeRatePct: legacy.negativeRatePct,
      summary: entry.summaryJa,
      warning: SNS_WARNING,
      explanation: '取得X投稿のルールベース分析（AI推測ではありません）',
      source: 'available',
      xSentiment: entry.sentiment,
    };
  }
  const score = Math.round(
    entry.buzzScore * 0.35 + entry.positiveRatePct * 0.45 + (100 - entry.negativeRatePct) * 0.2,
  );
  return {
    score: Math.max(0, Math.min(100, score)),
    buzzScore: entry.buzzScore,
    positiveRatePct: entry.positiveRatePct,
    negativeRatePct: entry.negativeRatePct,
    summary: entry.summaryJa,
    warning: SNS_WARNING,
    explanation: entry.fromCache
      ? 'X要約（15分キャッシュ）'
      : 'X要約（節約モード）',
    source: 'available',
  };
}

export async function fetchXInsightForStock(
  stock: StockFundamentals,
  bearerToken: string,
  forceRefresh = false,
): Promise<{ sns: SnsAnalysisResult; fetch: XApiFetchResult }> {
  const posts = await fetchXPostsForStock(stock, bearerToken, forceRefresh);
  if (posts.ok && posts.snapshot) {
    const legacy = sentimentSnapshotToLegacyRates(posts.snapshot.sentimentPct);
    return {
      sns: xCacheEntryToSnsResult({
        symbol: stock.symbol,
        market: stock.market,
        companyName: stock.name,
        fetchedAt: posts.snapshot.fetchedAt,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        postCount: posts.snapshot.postCount,
        summaryJa: posts.snapshot.summaryJa,
        buzzScore: posts.snapshot.buzzScore,
        positiveRatePct: legacy.positiveRatePct,
        negativeRatePct: legacy.negativeRatePct,
        fromCache: posts.snapshot.fromCache,
        sentiment: posts.snapshot,
      }),
      fetch: {
        ok: true,
        cacheHit: posts.cacheHit,
        entry: null,
      },
    };
  }
  const SNS_WARNING = 'SNSの話題性は短期的に大きく変わります。参考程度に留めてください。';
  return {
    sns: {
      score: 50,
      buzzScore: 0,
      positiveRatePct: 0,
      negativeRatePct: 0,
      summary: posts.errorJa ?? 'Xデータ未取得（アプリは通常動作）',
      warning: SNS_WARNING,
      explanation: 'X APIは停止または未設定です。ニュース分析へフォールバック可能です。',
      source: 'unavailable',
    },
    fetch: {
      ok: false,
      cacheHit: posts.cacheHit,
      entry: null,
      errorJa: posts.errorJa,
      skippedReason: posts.skippedReason,
      httpStatus: posts.httpStatus,
    },
  };
}
