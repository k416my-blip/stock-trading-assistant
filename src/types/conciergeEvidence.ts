import type { Market } from './index';
import type { AiAnalysisMode } from '../constants/aiDataDriven';
import type { ConciergeActionGuideBundle } from './conciergeActionGuide';
import type { ConciergeRiskControlBundle } from './conciergeRiskControl';
import type { SourceReliabilityTier } from './conciergeRiskControl';

export type ConciergeUnusualFlagId =
  | 'sharp_drop_5pct'
  | 'volume_surge_3x'
  | 'negative_post_surge'
  | 'negative_ratio_70'
  | 'sentiment_shift';

export type ConciergeUnusualFlag = {
  id: ConciergeUnusualFlagId;
  labelJa: string;
};

export type ConciergeNewsHeadlineEvidence = {
  title: string;
  sentiment: string;
  sourceTier?: SourceReliabilityTier;
  fetchedAtIso?: string;
  ageSeconds?: number;
  rumorLabel?: boolean;
};

export type ConciergeXSentimentEvidence = {
  postCount: number;
  bullishPct: number;
  bearishPct: number;
  panicPct: number;
  hypePct: number;
  trendWords: string[];
  postSurgeRatePct: number | null;
  summaryJa: string;
  analysisBasis: string;
  fromCache: boolean;
  fetchedAtIso?: string;
  ageSeconds?: number;
};

export type ConciergeSymbolEvidence = {
  symbol: string;
  companyName: string;
  market: Market;
  displayLabelJa: string;
  currentPrice: number | null;
  previousClose: number | null;
  intradayChangePct: number | null;
  volume: number | null;
  volumeSurgeRatio: number | null;
  quoteAgeSeconds: number | null;
  quoteIsStale: boolean;
  portfolioHolding: {
    shares: number;
    averageBuyPrice: number;
    unrealizedPnlPct: number | null;
  } | null;
  latestFinancialNews: ConciergeNewsHeadlineEvidence[];
  newsSummaryJa: string;
  newsSource: string;
  xSentiment: ConciergeXSentimentEvidence | null;
  trendingKeywords: string[];
  unusualActivityFlags: ConciergeUnusualFlag[];
  dataGapsJa: string[];
};

/** actionGuide 付与前の根拠データ */
export type ConciergeEvidenceCore = {
  generatedAt: string;
  analysisMode: AiAnalysisMode;
  symbols: ConciergeSymbolEvidence[];
  globalSummaryJa: string;
  cacheNotesJa: string[];
};

export type ConciergeEvidenceBundle = ConciergeEvidenceCore & {
  /** 投資行動支援（ルールベース） */
  actionGuide: ConciergeActionGuideBundle;
  /** リスク統制・幻覚抑制 */
  riskControl: ConciergeRiskControlBundle;
};
