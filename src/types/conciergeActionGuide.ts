import type { Market } from './index';

export type AiActionCategory =
  | 'watch'
  | 'caution'
  | 'panic'
  | 'opportunity'
  | 'profit-taking'
  | 'high-risk'
  | 'unusual-volume'
  | 'rumor-alert';

export type MarketStance = 'bullish' | 'neutral' | 'bearish';

export type EvidenceScoreKey = 'priceAction' | 'volume' | 'news' | 'xSentiment' | 'volatility';

export type NotificationPriorityTier = 'critical' | 'high' | 'medium' | 'low';

export type ConciergeSymbolActionGuide = {
  symbol: string;
  market: Market;
  displayLabelJa: string;
  primaryCategory: AiActionCategory;
  categories: AiActionCategory[];
  marketStance: MarketStance;
  marketStanceLabelJa: string;
  reasonBulletsJa: string[];
  recommendedActionsJa: string[];
  attentionPointsJa: string[];
  riskSummaryJa: string;
  confidencePct: number;
  insufficientData: boolean;
  insufficientDataLabelJa: string | null;
  evidenceScores: Record<EvidenceScoreKey, number>;
  notificationPriority: NotificationPriorityTier;
  notificationWhyJa: string;
};

export type ConciergeActionGuideBundle = {
  generatedAt: string;
  symbols: ConciergeSymbolActionGuide[];
  overallConfidencePct: number;
  overallStance: MarketStance;
  overallStanceLabelJa: string;
  primaryCategory: AiActionCategory;
  aggregatedRecommendationsJa: string[];
  aggregatedRisksJa: string[];
  aggregatedAttentionJa: string[];
};
