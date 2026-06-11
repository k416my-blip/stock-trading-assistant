/**
 * Phase18.8 — Multi-Article Event Aggregation（同一Eventクラスタ集約）
 */
import type {
  NewsEventType,
  NewsIntelligenceArticle,
  NewsSentiment,
} from '../../types/bursaNewsIntelligence';
import { getExpansionEventDirection } from './bursaNewsEventExpansionEngine';

export type NewsEventCluster = {
  eventType: NewsEventType;
  clusterLabel: string;
  articleCount: number;
  sourceDiversity: number;
  recency24h: number;
  recency72h: number;
  recency7d: number;
  averageImpact: number;
  averageConfidence: number;
  frequencyWeight: number;
  sourceWeight: number;
  timeWeight: number;
  eventScore: number;
  netSentiment: NewsSentiment;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function recencyBucket(publishedAt: string | null, now = Date.now()): '24h' | '72h' | '7d' | 'older' {
  if (!publishedAt) return 'older';
  const ageHours = (now - new Date(publishedAt).getTime()) / 3_600_000;
  if (ageHours <= 24) return '24h';
  if (ageHours <= 72) return '72h';
  if (ageHours <= 168) return '7d';
  return 'older';
}

export function computeFrequencyWeight(articleCount: number): number {
  if (articleCount <= 1) return 0.5;
  if (articleCount === 2) return 0.75;
  if (articleCount === 3) return 0.9;
  return 1;
}

export function computeSourceWeight(sourceDiversity: number): number {
  if (sourceDiversity <= 1) return 0.6;
  if (sourceDiversity === 2) return 0.8;
  return 1;
}

export function computeClusterTimeWeight(articles: NewsIntelligenceArticle[]): number {
  if (articles.length === 0) return 0.35;
  const sum = articles.reduce((s, a) => s + a.recencyWeight, 0);
  return sum / articles.length;
}

export function computeClusterEventScore(input: {
  averageImpact: number;
  frequencyWeight: number;
  sourceWeight: number;
  timeWeight: number;
}): number {
  return clamp(
    Math.round(
      input.averageImpact * input.frequencyWeight * input.sourceWeight * input.timeWeight,
    ),
    0,
    100,
  );
}

function resolveClusterSentiment(
  articles: NewsIntelligenceArticle[],
  eventType: NewsEventType,
): NewsSentiment {
  let bullish = 0;
  let bearish = 0;
  for (const a of articles) {
    if (a.sentiment === 'Bullish') bullish += 1;
    else if (a.sentiment === 'Bearish') bearish += 1;
  }
  if (bullish > bearish) return 'Bullish';
  if (bearish > bullish) return 'Bearish';
  const dir = getExpansionEventDirection(eventType);
  if (dir === 'Bullish' || dir === 'Bearish') return dir;
  return 'Neutral';
}

export function buildEventClusters(
  articles: NewsIntelligenceArticle[],
  now = Date.now(),
): NewsEventCluster[] {
  const byEvent = new Map<NewsEventType, NewsIntelligenceArticle[]>();
  for (const a of articles) {
    const list = byEvent.get(a.eventType) ?? [];
    list.push(a);
    byEvent.set(a.eventType, list);
  }

  const clusters: NewsEventCluster[] = [];
  for (const [eventType, group] of byEvent.entries()) {
    const sources = new Set(group.map((a) => a.source));
    let r24 = 0;
    let r72 = 0;
    let r7d = 0;
    for (const a of group) {
      const bucket = recencyBucket(a.publishedAt, now);
      if (bucket === '24h') r24 += 1;
      else if (bucket === '72h') r72 += 1;
      else if (bucket === '7d') r7d += 1;
    }

    const averageImpact =
      group.reduce((s, a) => s + a.impactScore, 0) / group.length;
    const averageConfidence =
      group.reduce((s, a) => s + a.eventConfidence, 0) / group.length;
    const frequencyWeight = computeFrequencyWeight(group.length);
    const sourceWeight = computeSourceWeight(sources.size);
    const timeWeight = computeClusterTimeWeight(group);
    const eventScore = computeClusterEventScore({
      averageImpact,
      frequencyWeight,
      sourceWeight,
      timeWeight,
    });

    clusters.push({
      eventType,
      clusterLabel: `${eventType} Cluster`,
      articleCount: group.length,
      sourceDiversity: sources.size,
      recency24h: r24,
      recency72h: r72,
      recency7d: r7d,
      averageImpact: Math.round(averageImpact * 10) / 10,
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      frequencyWeight,
      sourceWeight,
      timeWeight: Math.round(timeWeight * 100) / 100,
      eventScore,
      netSentiment: resolveClusterSentiment(group, eventType),
    });
  }

  return clusters.sort((a, b) => b.eventScore - a.eventScore);
}

/** Phase18.8 — クラスタ集約材料スコア（-20〜+20） */
export function aggregateClusterMaterialScore(clusters: NewsEventCluster[]): number {
  let net = 0;
  for (const c of clusters) {
    if (c.eventType === 'Other') continue;
    if (c.netSentiment === 'Neutral') continue;
    const sign = c.netSentiment === 'Bullish' ? 1 : -1;
    net += sign * (c.eventScore / 100) * 20;
  }
  return clamp(Math.round(net * 10) / 10, -20, 20);
}
