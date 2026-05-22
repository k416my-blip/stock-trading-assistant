/** X投稿のルールベース・センチメント分析（取得データ優先・AI推測なし） */

export type XSentimentLabel = 'bullish' | 'bearish' | 'neutral' | 'panic' | 'hype';

export type XAnomalyId = 'negative_surge' | 'volume_surge' | 'pump_suspect' | 'rumor_spread';

export type XSentimentPct = Record<XSentimentLabel, number>;

export type XAnomalyAlert = {
  id: XAnomalyId;
  labelJa: string;
};

export type XSentimentSnapshot = {
  postCount: number;
  sentimentPct: XSentimentPct;
  trendWords: string[];
  /** 前回キャッシュ比の投稿増加率（%）。初回は null */
  postSurgeRatePct: number | null;
  anomalies: XAnomalyAlert[];
  buzzScore: number;
  summaryJa: string;
  searchQuery: string;
  analysisBasis: 'fetched_posts' | 'news_fallback' | 'estimated';
  fromCache: boolean;
  quotaRemainingToday: number;
  fetchedAt: string;
};

export type XRawPost = {
  text: string;
  createdAt?: string;
};
