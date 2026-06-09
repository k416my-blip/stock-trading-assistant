/**
 * コンシェルジュ実運用 — X取得 + [X_FETCH] 診断
 */
import { X_API_BASE, X_SEARCH_MAX_RESULTS } from '../constants/xApiConservation';
import type { StockFundamentals } from '../types';
import type { ConciergeFetchResultRow, ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { AnalysisApiKeys } from './analysisApiKeys';
import { findStock } from '../data/sampleStocks';
import { logXFetch } from './conciergeOperationalFetchLog';
import { resolveXBearerToken } from './xBearerToken';
import { fetchXPostsForStock } from './xApiService';
import { buildXSearchQuery } from './xSentimentEngine';
import { loadCachedXSentimentForStock } from './xSentimentAnalysis';

function buildXRequestUrl(query: string): string {
  const url = new URL(`${X_API_BASE}/tweets/search/recent`);
  url.searchParams.set('query', query);
  url.searchParams.set('max_results', String(X_SEARCH_MAX_RESULTS));
  url.searchParams.set('tweet.fields', 'created_at,lang,public_metrics');
  return url.toString();
}

function mapSnapshot(
  xs: NonNullable<Awaited<ReturnType<typeof loadCachedXSentimentForStock>>>,
): ConciergeSymbolEvidence['xSentiment'] {
  const fetchedAtIso = xs.fetchedAt ?? new Date().toISOString();
  const ageSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(fetchedAtIso)) / 1000));
  return {
    postCount: xs.postCount,
    bullishPct: xs.sentimentPct.bullish,
    bearishPct: xs.sentimentPct.bearish,
    panicPct: xs.sentimentPct.panic,
    hypePct: xs.sentimentPct.hype,
    trendWords: xs.trendWords,
    postSurgeRatePct: xs.postSurgeRatePct,
    summaryJa: xs.summaryJa,
    analysisBasis: xs.analysisBasis,
    fromCache: xs.fromCache,
    fetchedAtIso,
    ageSeconds,
  };
}

function xRow(
  ok: boolean,
  postCount: number,
  fromCache: boolean,
  error?: string,
): ConciergeFetchResultRow {
  const detailJa = error
    ? error
    : ok
      ? `投稿${postCount}件${fromCache ? '（キャッシュ）' : ''}`
      : '未取得';
  return {
    source: 'x',
    ok,
    detailJa,
    postCount,
    error: error || undefined,
  };
}

export async function fetchConciergeXEvidence(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
  fetchLive: boolean,
): Promise<{
  xSentiment: ConciergeSymbolEvidence['xSentiment'];
  row: ConciergeFetchResultRow;
}> {
  const companyName = stock.name?.trim() || findStock(stock.symbol)?.name;
  const query = buildXSearchQuery(stock.symbol, companyName);
  const requestUrl = buildXRequestUrl(query);

  if (!fetchLive) {
    const cached = await loadCachedXSentimentForStock(stock);
    const postsCount = cached?.postCount ?? 0;
    const error = !cached
      ? 'skipped: no X intent in message; cache empty'
      : postsCount === 0
        ? '0 posts in cache'
        : undefined;
    logXFetch({
      query,
      requestUrl: '(cache-only)',
      status: cached ? 'cache' : 'skipped',
      postsCount,
      error,
    });
    return {
      xSentiment: cached ? mapSnapshot(cached) : null,
      row: xRow(postsCount > 0, postsCount, true, error),
    };
  }

  const bearer = resolveXBearerToken(apiKeys.xApiKey.trim() || apiKeys.snsApiKey.trim());
  if (!bearer) {
    const error = 'X bearer token missing in analysisApiKeys';
    logXFetch({ query, requestUrl, status: 'no_key', postsCount: 0, error });
    return { xSentiment: null, row: xRow(false, 0, false, error) };
  }

  const fetch = await fetchXPostsForStock(stock, bearer, false);
  const postsCount = fetch.snapshot?.postCount ?? 0;
  const status = fetch.httpStatus ?? (fetch.ok ? 200 : fetch.skippedReason ?? 'failed');
  let error = '';
  if (!fetch.ok) {
    error = fetch.errorJa ?? `X fetch failed (${String(fetch.skippedReason ?? 'unknown')})`;
  } else if (postsCount === 0) {
    error = '0 posts returned';
  }

  logXFetch({
    query,
    requestUrl,
    status,
    postsCount,
    error: error || undefined,
  });

  if (fetch.ok && fetch.snapshot) {
    return {
      xSentiment: mapSnapshot({ ...fetch.snapshot, fromCache: fetch.cacheHit }),
      row: xRow(postsCount > 0, postsCount, fetch.cacheHit, postsCount === 0 ? error : undefined),
    };
  }

  const cached = await loadCachedXSentimentForStock(stock);
  if (cached && cached.postCount > 0) {
    return {
      xSentiment: mapSnapshot(cached),
      row: xRow(true, cached.postCount, true, error || undefined),
    };
  }

  return {
    xSentiment: null,
    row: xRow(false, 0, false, error || 'X fetch failed'),
  };
}
