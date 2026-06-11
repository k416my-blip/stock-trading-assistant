/** Phase18 — News Intelligence ドメイン型 */

export type NewsIntelligenceSource =
  | 'news_api'
  | 'yahoo_finance_news'
  | 'bursa_announcements'
  | 'rss_news'
  | 'company_announcement'
  | 'none';

export type NewsSentiment = 'Bullish' | 'Neutral' | 'Bearish';

export type NewsEventType =
  | 'Earnings'
  | 'Guidance Raise'
  | 'Guidance Cut'
  | 'Contract Award'
  | 'Large Order'
  | 'Dividend Increase'
  | 'Dividend Cut'
  | 'Acquisition'
  | 'Disposal'
  | 'Regulatory Approval'
  | 'Regulatory Risk'
  | 'Management Change'
  | 'Product Launch'
  | 'Expansion'
  | 'Partnership'
  | 'Regulatory'
  | 'M&A'
  | 'Analyst Upgrade'
  | 'Analyst Downgrade'
  | 'Share Buyback'
  | 'Capital Raising'
  | 'Commodity'
  | 'Interest Rate'
  | 'Currency'
  | 'Other';

export type NewsIntelligenceArticle = {
  headline: string;
  publishedAt: string | null;
  source: NewsIntelligenceSource;
  sourceLabel: string;
  sentiment: NewsSentiment;
  impactScore: number;
  eventType: NewsEventType;
  /** Phase18.7 — 拡張前Event（比較用） */
  preExpansionEventType: NewsEventType;
  /** Phase18.6 — Stage1キーワード分類 */
  stage1EventType: NewsEventType;
  /** Phase18.6 — 分類信頼度 0〜100 */
  eventConfidence: number;
  /** Phase18.6 — Stage2検証通過 */
  eventValidated: boolean;
  rejectionReason: string | null;
  url: string | null;
  recencyWeight: number;
  dedupeKey: string;
};

export type NewsIntelligenceDisplayFields = {
  articleCount: string;
  last24hCount: string;
  bullishCount: string;
  bearishCount: string;
  neutralCount: string;
  aggregateImpact: string;
  topHeadline: string;
  topEventType: string;
  topImpactScore: string;
  sourceCoverage: string;
  impactEngine: string;
  clusterCount: string;
  topClusterScore: string;
};

/** Phase18.8 — 同一Event記事クラスタ */
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

export type BursaNewsIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  articles: NewsIntelligenceArticle[];
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  last24hCount: number;
  aggregateImpactScore: number;
  netSentimentScore: number;
  /** Phase18.5 — Event種別分布 */
  eventTypeDistribution: Partial<Record<NewsEventType, number>>;
  /** Phase18.5 — Impact分布（low<40 / mid 40-69 / high≥70） */
  impactDistribution: {
    low: number;
    mid: number;
    high: number;
    avg: number;
    max: number;
  };
  /** Phase18.5 — Event分類再適用一致率 */
  eventClassificationAccuracy: number;
  /** Phase18.6 — Confidence分布（low<50 / mid 50-79 / high≥80） */
  confidenceDistribution: {
    low: number;
    mid: number;
    high: number;
    avg: number;
  };
  /** Phase18.6 — Stage1→Stage2で修正されたサンプル */
  misclassificationSamples: Array<{
    headline: string;
    stage1EventType: NewsEventType;
    eventType: NewsEventType;
    eventConfidence: number;
    rejectionReason: string | null;
  }>;
  /** Phase18.7 — 拡張前Other件数 */
  otherCountBeforeExpansion: number;
  /** Phase18.7 — 拡張後Other件数 */
  otherCountAfterExpansion: number;
  /** Phase18.7 — Other削減率 */
  otherReductionRate: number;
  /** Phase18.8 — Eventクラスタ一覧 */
  eventClusters: NewsEventCluster[];
  /** Phase18.8 — 上位クラスタ（最大10） */
  topEventClusters: NewsEventCluster[];
  /** Phase18.7 — 記事単位News補助 */
  materialScoreAdjustment187: number;
  /** Phase18.8 — クラスタ集約News補助 */
  materialScoreAdjustment188: number;
  sourceCoverageRate: number;
  fieldAcquisitionRate: number;
  materialWeightMax: number;
  sourcesUsed: NewsIntelligenceSource[];
  unavailableReason: string | null;
  displayJa: NewsIntelligenceDisplayFields;
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const NEWS_INTELLIGENCE_UNAVAILABLE_JA = 'データ未取得';
