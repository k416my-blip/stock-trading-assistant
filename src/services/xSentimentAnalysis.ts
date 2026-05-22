/**
 * X API センチメント分析 — ユーザー要求時のみ・15分キャッシュ
 */
import type { StockFundamentals } from '../types';
import type { SnsAnalysisResult } from '../types/recommendation';
import type { XSentimentSnapshot } from '../types/xSentiment';
import { X_HTTP_402_USER_MESSAGE_JA } from '../constants/xApiOptional';
import type { AnalysisApiKeys } from './analysisApiKeys';
import { analyzeNews } from './analysis/newsAnalysis';
import { fetchFreeNewsFallback, freeNewsToSnsMetrics } from './freeNewsFallback';
import { fetchXPostsForStock } from './xApiService';
import { resolveXBearerToken } from './xBearerToken';
import { isXPaidSearchAllowed } from './xApiOptionalModeStorage';
import {
  analyzePostsSentiment,
  buildXSearchQuery,
  sentimentSnapshotToLegacyRates,
} from './xSentimentEngine';
import { getXApiUsageDashboard } from './xApiUsageStorage';
import { recordXApiCall } from './apiCostTracker';
import { shouldPauseXApi } from './performanceCostRuntime';

const SNS_WARNING = 'SNSの話題性は短期的に大きく変わります。参考程度に留めてください。';

export function snapshotToSnsResult(snapshot: XSentimentSnapshot): SnsAnalysisResult {
  const legacy = sentimentSnapshotToLegacyRates(snapshot.sentimentPct);
  const score = Math.round(
    snapshot.buzzScore * 0.35 +
      legacy.positiveRatePct * 0.45 +
      (100 - legacy.negativeRatePct) * 0.2,
  );
  const basisNote =
    snapshot.analysisBasis === 'fetched_posts'
      ? '取得したX投稿のルールベース分析（AI推測ではありません）'
      : snapshot.analysisBasis === 'news_fallback'
        ? 'X未取得 — ニュースRSSの分析'
        : '推定値';

  return {
    score: Math.max(0, Math.min(100, score)),
    buzzScore: snapshot.buzzScore,
    positiveRatePct: legacy.positiveRatePct,
    negativeRatePct: legacy.negativeRatePct,
    summary: snapshot.summaryJa,
    warning: SNS_WARNING,
    explanation: basisNote,
    source: snapshot.analysisBasis === 'estimated' ? 'estimated' : 'available',
    xSentiment: snapshot,
  };
}

async function buildNewsFallbackSnapshot(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
  reasonJa: string,
): Promise<XSentimentSnapshot> {
  const [news, freeNews, quota] = await Promise.all([
    analyzeNews(stock, apiKeys),
    fetchFreeNewsFallback(stock, apiKeys),
    getXApiUsageDashboard(),
  ]);
  const metrics = freeNewsToSnsMetrics(freeNews.headlines);
  const pos = metrics.positiveRatePct;
  const neg = metrics.negativeRatePct;
  const neu = Math.max(0, 100 - pos - neg);
  const trendWords = freeNews.headlines
    .slice(0, 5)
    .map((h) => h.title.split(/\s+/).slice(0, 3).join(' '))
    .filter(Boolean);

  return {
    postCount: freeNews.headlines.length,
    sentimentPct: {
      bullish: Math.round(pos * 0.7),
      bearish: Math.round(neg * 0.6),
      neutral: neu,
      panic: Math.round(neg * 0.25),
      hype: Math.round(pos * 0.2),
    },
    trendWords,
    postSurgeRatePct: null,
    anomalies: [],
    buzzScore: metrics.buzzScore,
    summaryJa: `${reasonJa} — ${freeNews.summaryJa}（ニュース: ${news.sentiment}）`,
    searchQuery: buildXSearchQuery(stock.symbol, stock.name),
    analysisBasis: 'news_fallback',
    fromCache: false,
    quotaRemainingToday: quota.remainingToday,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * 銘柄検索・詳細画面 — ユーザーが明示的に要求したときのみ X API を呼ぶ
 */
export async function analyzeXSentimentOnUserRequest(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
  options?: { forceRefresh?: boolean },
): Promise<SnsAnalysisResult> {
  if (shouldPauseXApi()) {
    const cached = await loadCachedXSentimentForStock(stock);
    if (cached) return snapshotToSnsResult({ ...cached, fromCache: true });
    const snap = await buildNewsFallbackSnapshot(stock, apiKeys, 'X API一時停止（省電力/バックグラウンド）');
    return snapshotToSnsResult(snap);
  }

  const gate = await isXPaidSearchAllowed();
  if (!gate.allowed) {
    const snap = await buildNewsFallbackSnapshot(stock, apiKeys, gate.reasonJa ?? 'X optional');
    return snapshotToSnsResult(snap);
  }

  const bearer = resolveXBearerToken(apiKeys.xApiKey.trim() || apiKeys.snsApiKey.trim());
  if (!bearer) {
    const snap = await buildNewsFallbackSnapshot(stock, apiKeys, 'X API未設定');
    return snapshotToSnsResult(snap);
  }

  const fetch = await fetchXPostsForStock(stock, bearer, options?.forceRefresh ?? false);
  if (fetch.ok && fetch.snapshot) {
    recordXApiCall(1);
  }
  if (!fetch.ok || !fetch.snapshot) {
    const reason =
      fetch.httpStatus === 402
        ? X_HTTP_402_USER_MESSAGE_JA
        : fetch.errorJa ?? 'X API未取得';
    const snap = await buildNewsFallbackSnapshot(stock, apiKeys, reason);
    return snapshotToSnsResult(snap);
  }

  return snapshotToSnsResult(fetch.snapshot);
}

/** キャッシュのみ参照（API呼び出しなし） */
export async function loadCachedXSentimentForStock(
  stock: StockFundamentals,
): Promise<XSentimentSnapshot | null> {
  const { getCachedXSymbolInsight } = await import('./xApiCacheStorage');
  const cached = await getCachedXSymbolInsight(stock.market, stock.symbol);
  return cached?.sentiment ?? null;
}
