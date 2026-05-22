import type { AiAnalysisMode } from '../constants/aiDataDriven';
import type { Market } from './index';

export type UserTradingStyleId =
  | 'averaging_down'
  | 'short_term'
  | 'long_term'
  | 'panic_seller'
  | 'balanced_trader';

export type PredictionKind = 'bullish' | 'bearish_watch' | 'panic_warning';

export type PredictionOutcome = 'pending' | 'hit' | 'miss' | 'inconclusive';

export type AiJournalKind =
  | 'notification'
  | 'caution'
  | 'prediction'
  | 'weekly_review'
  | 'ai_reply';

export type AiJournalEntry = {
  id: string;
  at: string;
  kind: AiJournalKind;
  symbol: string | null;
  market: Market | null;
  titleJa: string;
  bodyJa: string;
  whyJa: string | null;
};

export type TrackedPrediction = {
  id: string;
  createdAt: string;
  kind: PredictionKind;
  symbol: string;
  market: Market;
  horizonDays: number;
  baselinePrice: number | null;
  noteJa: string;
  outcome: PredictionOutcome;
  resolvedAt: string | null;
  actualReturnPct: number | null;
};

export type ClosedPositionMemory = {
  symbol: string;
  market: Market;
  avgBuyPrice: number;
  lastSellPrice: number | null;
  totalSharesTraded: number;
  holdDaysEstimate: number | null;
  realizedPnLMYR: number | null;
  tookProfit: boolean;
  stopLossLike: boolean;
};

export type PortfolioMemorySnapshot = {
  pastSymbols: string[];
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  closedPositions: ClosedPositionMemory[];
  avgHoldDays: number | null;
};

export type AiAccuracyScores = {
  shortTermAccuracyPct: number | null;
  mediumTermAccuracyPct: number | null;
  anomalyDetectionAccuracyPct: number | null;
  evaluatedCount: number;
  pendingCount: number;
};

export type UserBehaviorProfile = {
  primaryStyle: UserTradingStyleId;
  styleLabelJa: string;
  styleHintsJa: string[];
  panicSellScore: number;
  averagingDownScore: number;
};

export type PatternInsight = {
  id: string;
  labelJa: string;
  detailJa: string;
  confidencePct: number;
};

export type PortfolioBiasAnalysis = {
  sectorBiasJa: string[];
  currencyBiasJa: string[];
  volatilityBiasJa: string[];
  regionBiasJa: string[];
  concentrationScore: number;
};

export type WeeklyReviewSummary = {
  weekLabelJa: string;
  winRatePct: number | null;
  maxDrawdownPct: number | null;
  bestTradeJa: string | null;
  worstTradeJa: string | null;
  aiPredictionAccuracyPct: number | null;
  tradeCount: number;
  summaryBulletsJa: string[];
};

export type NotificationIntelEntry = {
  dedupeKey: string;
  showCount: number;
  lastShownAt: string;
  importanceScore: number;
};

export type PortfolioIntelligenceBundle = {
  generatedAt: string;
  memory: PortfolioMemorySnapshot;
  journalRecent: AiJournalEntry[];
  predictionsPending: TrackedPrediction[];
  accuracy: AiAccuracyScores;
  behavior: UserBehaviorProfile;
  suggestedAnalysisMode: AiAnalysisMode;
  lossPatterns: PatternInsight[];
  successPatterns: PatternInsight[];
  portfolioRisk: PortfolioBiasAnalysis;
  weeklyReview: WeeklyReviewSummary | null;
  similarCasesJa: string[];
  notificationIntelSummaryJa: string;
  privacyNoteJa: string;
  purposeNoteJa: string;
};

export type PortfolioIntelligenceState = {
  version: 1;
  journal: AiJournalEntry[];
  predictions: TrackedPrediction[];
  notificationIntel: NotificationIntelEntry[];
  journalArchiveSummaryJa: string | null;
  lastWeeklyReviewAt: string | null;
  privacyLocalOnly: boolean;
  updatedAt: string;
};
