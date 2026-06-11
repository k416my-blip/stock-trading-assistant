/**
 * Phase18 / 18.5 — News Intelligence + News Impact Engine
 */
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type {
  BursaNewsIntelligenceAnalysis,
  NewsEventType,
  NewsIntelligenceArticle,
  NewsIntelligenceDisplayFields,
  NewsIntelligenceSource,
  NewsSentiment,
} from '../../types/bursaNewsIntelligence';
import { NEWS_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaNewsIntelligence';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import { parseRecentAnnouncementsFromKlseHtml } from './bursaAnnouncementParser';
import { fetchKlseStockPageHtml } from './bursaKlseHtmlClient';
import {
  aggregateNewsImpactMaterialScore,
  buildEventTypeDistribution,
  buildImpactDistribution,
  classifyNewsImpactEvent,
  classifyValidatedNewsEvent,
  computeEventImpactScore,
  measureEventClassificationAccuracy,
  newsImpactRecencyWeight,
} from './bursaNewsImpactEngine';
import {
  aggregateClusterMaterialScore,
  buildEventClusters,
} from './bursaNewsEventClusterEngine';
import {
  buildConfidenceDistribution,
  collectMisclassificationSamples,
} from './bursaNewsEventValidationEngine';

const NEWS_API_TIMEOUT_MS = 10_000;
const RSS_TIMEOUT_MS = 10_000;

const SOURCE_PRIORITY: NewsIntelligenceSource[] = [
  'news_api',
  'yahoo_finance_news',
  'bursa_announcements',
  'rss_news',
  'company_announcement',
];

const BULLISH = /\b(surge|rally|beat|record|upgrade|strong|growth|profit\s+(rise|up|growth)|dividend\s+(increase|raise)|buyback|acquisition|contract\s+win|outperform)\b|増配|増益|好調|上方修正|買い上げ/i;
const BEARISH = /\b(plunge|crash|miss|loss|lawsuit|downgrade|cut|bankruptcy|default|fraud|suspend|halt|fall|drop|decline|weak)\b|減配|急減|赤字|下方修正|訴訟|下落|減益/i;

type RawNewsRow = {
  headline: string;
  publishedAt: string | null;
  source: NewsIntelligenceSource;
  sourceLabel: string;
  url: string | null;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeDedupeKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, ' ')
    .trim()
    .slice(0, 80);
}

function parseIsoOrRfcDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function classifyNewsSentiment(headline: string): NewsSentiment {
  const bullish = BULLISH.test(headline);
  const bearish = BEARISH.test(headline);
  if (bullish && !bearish) return 'Bullish';
  if (bearish && !bullish) return 'Bearish';
  return 'Neutral';
}

/** Phase18.5 Event分類（後方互換エクスポート） */
export function classifyNewsEventType(headline: string): NewsEventType {
  return classifyNewsImpactEvent(headline);
}

export function computeArticleImpactScore(input: {
  headline: string;
  sentiment?: NewsSentiment;
  publishedAt?: string | null;
  source?: NewsIntelligenceSource;
  eventType?: NewsEventType;
}): number {
  const eventType = input.eventType ?? classifyNewsImpactEvent(input.headline);
  return computeEventImpactScore(eventType, input.headline);
}

export { newsImpactRecencyWeight as recencyWeight };

function parseRssItems(xml: string, limit: number): Array<{ title: string; publishedAt: string | null }> {
  const items: Array<{ title: string; publishedAt: string | null }> = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
    const block = m[1] ?? '';
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
    const lower = title.toLowerCase();
    if (
      title.length <= 4 ||
      lower.includes('yahoo finance') ||
      lower.startsWith('google news')
    ) {
      continue;
    }
    const pub =
      block.match(/<pubDate>([^<]+)<\/pubDate>/i)?.[1] ??
      block.match(/<published>([^<]+)<\/published>/i)?.[1] ??
      null;
    items.push({ title, publishedAt: parseIsoOrRfcDate(pub) });
  }
  return items;
}

async function fetchRssXml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNewsApiRows(input: {
  companyName: string | null;
  stockCode: string;
  apiKey: string;
}): Promise<RawNewsRow[]> {
  const q = encodeURIComponent(`${input.companyName ?? ''} ${input.stockCode} Malaysia`.trim());
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=8`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_API_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'X-Api-Key': input.apiKey.trim() },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      articles?: Array<{ title?: string; url?: string; publishedAt?: string }>;
    };
    return (json.articles ?? [])
      .filter((a) => a.title?.trim())
      .map((a) => ({
        headline: a.title!.trim(),
        publishedAt: parseIsoOrRfcDate(a.publishedAt),
        source: 'news_api' as const,
        sourceLabel: 'NewsAPI',
        url: a.url ?? null,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchYahooFinanceNewsRows(stockCode: string): Promise<RawNewsRow[]> {
  const sym = encodeURIComponent(`${stockCode.replace(/\.KL$/i, '')}.KL`);
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${sym}&region=US&lang=en-US`;
  const xml = await fetchRssXml(url);
  if (!xml) return [];
  return parseRssItems(xml, 8).map((item) => ({
    headline: item.title,
    publishedAt: item.publishedAt,
    source: 'yahoo_finance_news' as const,
    sourceLabel: 'Yahoo Finance News',
    url: null,
  }));
}

async function fetchRssNewsRows(stockCode: string, companyName: string | null): Promise<RawNewsRow[]> {
  const q = encodeURIComponent(`${companyName ?? stockCode} ${stockCode} Malaysia stock`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-MY&gl=MY&ceid=MY:en`;
  const xml = await fetchRssXml(url);
  if (!xml) return [];
  return parseRssItems(xml, 8).map((item) => ({
    headline: item.title,
    publishedAt: item.publishedAt,
    source: 'rss_news' as const,
    sourceLabel: 'RSS News',
    url: null,
  }));
}

async function fetchBursaAnnouncementRssRows(stockCode: string, companyName: string | null): Promise<RawNewsRow[]> {
  const core = stockCode.replace(/\.KL$/i, '').trim();
  const q = encodeURIComponent(
    `"${companyName ?? core}" OR ${core} Bursa Malaysia company announcement site:bursamalaysia.com`,
  );
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-MY&gl=MY&ceid=MY:en`;
  const xml = await fetchRssXml(url);
  if (!xml) return [];
  return parseRssItems(xml, 6).map((item) => ({
    headline: item.title,
    publishedAt: item.publishedAt,
    source: 'bursa_announcements' as const,
    sourceLabel: 'Bursa Announcements',
    url: null,
  }));
}

function fetchCompanyAnnouncementRows(
  stockHtml: string | null,
  stockCode: string,
): RawNewsRow[] {
  if (!stockHtml?.trim()) return [];
  return parseRecentAnnouncementsFromKlseHtml(stockHtml, stockCode).map((a) => ({
    headline: a.title,
    publishedAt: parseIsoOrRfcDate(a.publishedAt),
    source: 'company_announcement' as const,
    sourceLabel: 'Company Announcement',
    url: a.url,
  }));
}

export function deduplicateNewsRows(rows: RawNewsRow[]): RawNewsRow[] {
  const byKey = new Map<string, RawNewsRow>();
  for (const row of rows) {
    const key = normalizeDedupeKey(row.headline);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const existingPri = SOURCE_PRIORITY.indexOf(existing.source);
    const rowPri = SOURCE_PRIORITY.indexOf(row.source);
    if (rowPri < existingPri) {
      byKey.set(key, row);
      continue;
    }
    if (rowPri === existingPri) {
      const exTime = existing.publishedAt ? new Date(existing.publishedAt).getTime() : 0;
      const rowTime = row.publishedAt ? new Date(row.publishedAt).getTime() : 0;
      if (rowTime > exTime) byKey.set(key, row);
    }
  }
  return [...byKey.values()];
}

export function buildNewsArticles(rows: RawNewsRow[]): NewsIntelligenceArticle[] {
  return rows.map((row) => {
    const sentiment = classifyNewsSentiment(row.headline);
    const publishedAt = row.publishedAt;
    const recency = newsImpactRecencyWeight(publishedAt);
    const validated = classifyValidatedNewsEvent(row.headline);
    const eventType = validated.eventType;
    return {
      headline: row.headline,
      publishedAt,
      source: row.source,
      sourceLabel: row.sourceLabel,
      sentiment,
      impactScore: computeEventImpactScore(eventType, row.headline),
      eventType,
      preExpansionEventType: validated.preExpansionEventType,
      stage1EventType: validated.stage1EventType,
      eventConfidence: validated.eventConfidence,
      eventValidated: validated.eventValidated,
      rejectionReason: validated.rejectionReason,
      url: row.url,
      recencyWeight: recency,
      dedupeKey: normalizeDedupeKey(row.headline),
    };
  });
}

function buildDisplayFields(input: {
  articles: NewsIntelligenceArticle[];
  sourceCoverageRate: number;
  clusterCount: number;
  topClusterScore: number;
}): NewsIntelligenceDisplayFields {
  const top = [...input.articles].sort((a, b) => b.impactScore - a.impactScore)[0];
  const bullish = input.articles.filter((a) => a.sentiment === 'Bullish').length;
  const bearish = input.articles.filter((a) => a.sentiment === 'Bearish').length;
  const neutral = input.articles.filter((a) => a.sentiment === 'Neutral').length;
  const last24h = input.articles.filter((a) => a.recencyWeight >= 1).length;
  const aggregateImpact =
    input.articles.length > 0
      ? input.articles.reduce((s, a) => s + a.impactScore * a.recencyWeight, 0) /
        input.articles.length
      : 0;

  return {
    articleCount: String(input.articles.length),
    last24hCount: String(last24h),
    bullishCount: String(bullish),
    bearishCount: String(bearish),
    neutralCount: String(neutral),
    aggregateImpact: aggregateImpact.toFixed(1),
    topHeadline: top?.headline.slice(0, 72) ?? '未取得',
    topEventType: top?.eventType ?? 'Other',
    topImpactScore: top ? String(top.impactScore) : '0',
    sourceCoverage: `${Math.round(input.sourceCoverageRate * 100)}%`,
    impactEngine: 'Phase18.8',
    clusterCount: String(input.clusterCount),
    topClusterScore: String(input.topClusterScore),
  };
}

function emptyAnalysis(reason: string | null = null): BursaNewsIntelligenceAnalysis {
  return {
    availability: 'unavailable',
    availabilityLabelJa: NEWS_INTELLIGENCE_UNAVAILABLE_JA,
    articles: [],
    bullishCount: 0,
    bearishCount: 0,
    neutralCount: 0,
    last24hCount: 0,
    aggregateImpactScore: 0,
    netSentimentScore: 0,
    sourceCoverageRate: 0,
    fieldAcquisitionRate: 0,
    materialWeightMax: 0,
    sourcesUsed: [],
    unavailableReason: reason ?? NEWS_INTELLIGENCE_UNAVAILABLE_JA,
    displayJa: {
      articleCount: '0',
      last24hCount: '0',
      bullishCount: '0',
      bearishCount: '0',
      neutralCount: '0',
      aggregateImpact: '0',
      topHeadline: '未取得',
      topEventType: 'Other',
      topImpactScore: '0',
      sourceCoverage: '0%',
      impactEngine: 'Phase18.8',
      clusterCount: '0',
      topClusterScore: '0',
    },
    evaluationJa: NEWS_INTELLIGENCE_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
    eventTypeDistribution: {},
    impactDistribution: { low: 0, mid: 0, high: 0, avg: 0, max: 0 },
    eventClassificationAccuracy: 0,
    confidenceDistribution: { low: 0, mid: 0, high: 0, avg: 0 },
    misclassificationSamples: [],
    otherCountBeforeExpansion: 0,
    otherCountAfterExpansion: 0,
    otherReductionRate: 0,
    eventClusters: [],
    topEventClusters: [],
    materialScoreAdjustment187: 0,
    materialScoreAdjustment188: 0,
  };
}

export async function buildNewsIntelligenceAnalysis(input: {
  stockCode: string;
  companyName: string | null;
  stockHtml: string | null;
  bundle?: BursaDisclosureBundle | null;
  apiKeys?: AnalysisApiKeys;
  fetchLiveExternal: boolean;
}): Promise<BursaNewsIntelligenceAnalysis> {
  if (!input.fetchLiveExternal) {
    return emptyAnalysis('fetchLiveExternal=false');
  }

  let stockHtml = input.stockHtml;
  if (!stockHtml?.trim()) {
    const page = await fetchKlseStockPageHtml(input.stockCode);
    stockHtml = page?.html ?? null;
  }

  const apiKey = input.apiKeys?.newsApiKey?.trim() ?? '';
  const sourceResults = await Promise.all([
    apiKey
      ? fetchNewsApiRows({
          companyName: input.companyName,
          stockCode: input.stockCode,
          apiKey,
        })
      : Promise.resolve([]),
    fetchYahooFinanceNewsRows(input.stockCode),
    fetchBursaAnnouncementRssRows(input.stockCode, input.companyName),
    fetchRssNewsRows(input.stockCode, input.companyName),
    Promise.resolve(fetchCompanyAnnouncementRows(stockHtml, input.stockCode)),
  ]);

  const sourceLabels: NewsIntelligenceSource[] = [
    'news_api',
    'yahoo_finance_news',
    'bursa_announcements',
    'rss_news',
    'company_announcement',
  ];
  const sourcesUsed = sourceLabels.filter((_, i) => sourceResults[i]!.length > 0);
  const sourceCoverageRate = sourcesUsed.length / sourceLabels.length;

  const merged = deduplicateNewsRows(sourceResults.flat());
  if (merged.length === 0) {
    return emptyAnalysis('ニュース記事未取得');
  }

  const articles = buildNewsArticles(merged).sort(
    (a, b) => b.impactScore * b.recencyWeight - a.impactScore * a.recencyWeight,
  );

  const bullishCount = articles.filter((a) => a.sentiment === 'Bullish').length;
  const bearishCount = articles.filter((a) => a.sentiment === 'Bearish').length;
  const neutralCount = articles.filter((a) => a.sentiment === 'Neutral').length;
  const last24hCount = articles.filter((a) => a.recencyWeight >= 1).length;

  let netSentimentScore = 0;
  let impactSum = 0;
  for (const a of articles) {
    const sign = a.sentiment === 'Bullish' ? 1 : a.sentiment === 'Bearish' ? -1 : 0;
    netSentimentScore += sign * a.impactScore * a.recencyWeight;
    impactSum += a.impactScore * a.recencyWeight;
  }
  const aggregateImpactScore =
    articles.length > 0 ? impactSum / articles.length : 0;

  const withPublished = articles.filter((a) => a.publishedAt != null).length;
  const withSentiment = articles.length;
  const fieldAcquisitionRate =
    articles.length > 0
      ? (withPublished / articles.length) * 0.4 +
        (withSentiment / articles.length) * 0.3 +
        sourceCoverageRate * 0.3
      : 0;

  const top = articles[0];
  const eventClusters = buildEventClusters(articles);
  const topEventClusters = eventClusters.slice(0, 10);
  const materialAdj187 = aggregateNewsImpactMaterialScore(articles);
  const materialAdj188 = aggregateClusterMaterialScore(eventClusters);
  const eventTypeDistribution = buildEventTypeDistribution(articles);
  const impactDistribution = buildImpactDistribution(articles);
  const eventClassificationAccuracy = measureEventClassificationAccuracy(articles);
  const confidenceDistribution = buildConfidenceDistribution(articles);
  const misclassificationSamples = collectMisclassificationSamples(articles);
  const otherCountBeforeExpansion = articles.filter((a) => a.preExpansionEventType === 'Other').length;
  const otherCountAfterExpansion = articles.filter((a) => a.eventType === 'Other').length;
  const otherReductionRate =
    otherCountBeforeExpansion > 0
      ? (otherCountBeforeExpansion - otherCountAfterExpansion) / otherCountBeforeExpansion
      : 0;

  const evalParts = ['News Intelligence'];
  evalParts.push(`${articles.length}件`);
  evalParts.push(`24h:${last24hCount}`);
  evalParts.push(`B${bullishCount}/N${neutralCount}/Be${bearishCount}`);
  if (top) {
    evalParts.push(`${top.eventType} Impact${top.impactScore} Conf${top.eventConfidence}`);
    evalParts.push(top.headline.slice(0, 40));
  }
  evalParts.push(`Clusters:${eventClusters.length}`);
  if (topEventClusters[0]) {
    evalParts.push(
      `TopCluster ${topEventClusters[0].clusterLabel} Score${topEventClusters[0].eventScore}`,
    );
  }
  evalParts.push(`補助18.8${materialAdj188 >= 0 ? '+' : ''}${materialAdj188}`);

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    articles: articles.slice(0, 20),
    bullishCount,
    bearishCount,
    neutralCount,
    last24hCount,
    aggregateImpactScore,
    netSentimentScore,
    eventTypeDistribution,
    impactDistribution,
    eventClassificationAccuracy,
    confidenceDistribution,
    misclassificationSamples,
    otherCountBeforeExpansion,
    otherCountAfterExpansion,
    otherReductionRate,
    eventClusters,
    topEventClusters,
    materialScoreAdjustment187: materialAdj187,
    materialScoreAdjustment188: materialAdj188,
    sourceCoverageRate,
    fieldAcquisitionRate,
    materialWeightMax: 20,
    sourcesUsed,
    unavailableReason: null,
    displayJa: buildDisplayFields({
      articles,
      sourceCoverageRate,
      clusterCount: eventClusters.length,
      topClusterScore: topEventClusters[0]?.eventScore ?? 0,
    }),
    evaluationJa: evalParts.join(' · '),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

/** Phase18.7 — 記事単位材料スコア */
export function newsIntelligenceArticleMaterialScoreAdjustment(
  analysis: BursaNewsIntelligenceAnalysis | null,
): number {
  if (!analysis || analysis.availability !== 'available') {
    return 0;
  }
  if (analysis.materialScoreAdjustment187 != null) {
    return analysis.materialScoreAdjustment187;
  }
  if (analysis.articles.length === 0) return 0;
  return aggregateNewsImpactMaterialScore(analysis.articles);
}

/** Phase18.8 — クラスタ集約材料スコア（デフォルト） */
export function newsIntelligenceMaterialScoreAdjustment(
  analysis: BursaNewsIntelligenceAnalysis | null,
): number {
  if (!analysis || analysis.availability !== 'available') {
    return 0;
  }
  if (analysis.materialScoreAdjustment188 != null) {
    return analysis.materialScoreAdjustment188;
  }
  return aggregateClusterMaterialScore(analysis.eventClusters ?? []);
}

export function newsIntelligenceToMaterialInputs(
  analysis: BursaNewsIntelligenceAnalysis | null | undefined,
): import('./bursaMaterialSentiment').RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) {
    return [];
  }
  return [
    {
      source: 'bursa_announcement',
      title: analysis.evaluationJa.slice(0, 180),
      url: analysis.articles[0]?.url ?? null,
      publishedAt: analysis.articles[0]?.publishedAt ?? null,
      idSuffix: 'news-intelligence',
      sourceLabelJa: 'News Intelligence (Phase18.8)',
    },
  ];
}

/** Phase11ニュース材料のみ重複除外（Phase13〜18 集約行は保持） */
export function isPhase11NewsMaterialSource(
  source: string,
  sourceLabelJa?: string,
  id?: string,
): boolean {
  const label = sourceLabelJa ?? '';
  if (
    /\(Phase1[3-9]/i.test(label) ||
    /Phase18\.[5678]/i.test(label) ||
    /Phase19/i.test(label) ||
    /Sector Rotation/i.test(label)
  ) {
    return false;
  }

  if (source === 'news_api') return true;
  if (source === 'rss') return true;
  if (source === 'bursa_announcement') {
    const itemId = id ?? '';
    return itemId.includes('-ann-') || itemId.includes('-news-');
  }
  return false;
}
