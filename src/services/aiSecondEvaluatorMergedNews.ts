/**
 * AI第二評価用 — Yahoo RSS · Google News · NewsAPI を統合
 */
import type { StockFundamentals } from '../types';
import type { AnalysisApiKeys } from './analysisApiKeys';
import { analyzeNews } from './analysis/newsAnalysis';
import {
  fetchGoogleNewsRss,
  fetchYahooFinanceRss,
  type FreeNewsHeadline,
} from './freeNewsFallback';

export type MergedAiEvaluatorNews = {
  headlines: FreeNewsHeadline[];
  newsSummaryJa: string;
  newsSource: string;
  sourcesUsed: string[];
  newsApiCount: number;
  newsApiTitles: string[];
};

function dedupeHeadlines(items: FreeNewsHeadline[]): FreeNewsHeadline[] {
  const seen = new Set<string>();
  const out: FreeNewsHeadline[] = [];
  for (const item of items) {
    const key = item.title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 8) break;
  }
  return out;
}

function buildSummary(headlines: FreeNewsHeadline[], sourcesUsed: string[]): string {
  if (headlines.length === 0) {
    return '統合ニュース未取得';
  }
  const pos = headlines.filter((h) => h.sentiment === 'ポジティブ').length;
  const neg = headlines.filter((h) => h.sentiment === 'ネガティブ').length;
  const tone = pos > neg ? 'ポジ寄り' : neg > pos ? 'ネガ寄り' : '中立';
  const top = headlines[0]?.title.slice(0, 80) ?? '';
  return `${sourcesUsed.join(' + ')} · ${headlines.length}件 · ${tone} — ${top}${top.length >= 80 ? '…' : ''}`;
}

/** Yahoo RSS + Google News + NewsAPI（キーあり時） */
export async function fetchMergedNewsForAiEvaluator(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
): Promise<MergedAiEvaluatorNews> {
  const sourcesUsed: string[] = [];
  const collected: FreeNewsHeadline[] = [];

  const yahoo = await fetchYahooFinanceRss(stock).catch(() => [] as FreeNewsHeadline[]);
  if (yahoo.length > 0) sourcesUsed.push('Yahoo Finance RSS');
  collected.push(...yahoo);

  const google = await fetchGoogleNewsRss(stock).catch(() => [] as FreeNewsHeadline[]);
  if (google.length > 0) sourcesUsed.push('Google News RSS');
  collected.push(...google);

  let newsApiCount = 0;
  let newsApiTitles: string[] = [];
  if (apiKeys.newsApiKey.trim()) {
    const newsApi = await analyzeNews(stock, apiKeys);
    if (newsApi.source === 'available' && newsApi.headlines.length > 0) {
      sourcesUsed.push('NewsAPI');
      newsApiCount = newsApi.headlines.length;
      newsApiTitles = newsApi.headlines.map((h) => h.title);
      for (const h of newsApi.headlines) {
        collected.push({
          title: h.title,
          source: 'NewsAPI',
          sentiment: h.sentiment,
        });
      }
    }
  }

  const headlines = dedupeHeadlines(collected);
  const newsSource = sourcesUsed.length > 0 ? sourcesUsed.join(' + ') : 'none';
  return {
    headlines,
    newsSummaryJa: buildSummary(headlines, sourcesUsed),
    newsSource,
    sourcesUsed,
    newsApiCount,
    newsApiTitles,
  };
}
