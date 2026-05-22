import type { ConciergeMarketRegimeId } from './globalMarketAnalysis';
import type { Market } from './index';
import type { StrategyAction } from './strategyExecution';

export type RecommendationLifecycle = 'active' | 'expired' | 'succeeded' | 'failed';

export type ValidationHorizon = '1d' | '1w' | '1m';

export type PaperPosition = {
  symbol: string;
  market: Market;
  shares: number;
  avgPrice: number;
  openedAt: string;
};

export type PaperPortfolio = {
  startedAt: string;
  initialCapitalMYR: number;
  cashMYR: number;
  positions: PaperPosition[];
};

export type TrackedAiRecommendation = {
  id: string;
  createdAt: string;
  symbol: string;
  market: Market;
  action: StrategyAction;
  confidencePct: number;
  calibratedConfidencePct: number;
  baselinePrice: number | null;
  whyJa: string;
  regimeId: ConciergeMarketRegimeId | 'unknown';
  status: RecommendationLifecycle;
  horizon: ValidationHorizon;
  resolvedAt: string | null;
  returnPct: number | null;
  benchmarkId: string;
  benchmarkReturnPct: number | null;
  benchmarkDeltaPct: number | null;
  thinReasonFlag: boolean;
  humanReviewOnly: boolean;
  failureNoteJa: string | null;
};

export type PerformanceJournalDay = {
  dateKey: string;
  proposedCount: number;
  resolvedCount: number;
  summaryJa: string;
  missReasonJa: string | null;
};

export type RegimeAccuracy = {
  regimeId: string;
  winRatePct: number | null;
  count: number;
};

export type FailurePattern = {
  id: string;
  labelJa: string;
  count: number;
  detailJa: string;
};

export type StressSimulation = {
  crashScenarioPct: number;
  estimatedLossMYR: number;
  estimatedLossPct: number;
  sectorCollapseNoteJa: string;
};

export type MonteCarloResult = {
  simulations: number;
  medianReturnPct: number;
  worst5PctReturnPct: number;
  summaryJa: string;
};

export type StrategyAccuracyDashboard = {
  winRatePct: number | null;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  evaluatedCount: number;
  pendingCount: number;
  accuracy1d: number | null;
  accuracy1w: number | null;
  accuracy1m: number | null;
};

export type RealityValidationBundle = {
  generatedAt: string;
  paperPortfolio: PaperPortfolio;
  virtualPnLMYR: number;
  virtualReturnPct: number;
  trustScore: number;
  capitalPreservationMode: boolean;
  calibrationOffsetPct: number;
  dashboard: StrategyAccuracyDashboard;
  recentWinRatePct: number | null;
  maxFailureJa: string | null;
  strongestStrategyJa: string | null;
  dangerousStrategyJa: string | null;
  regimeAccuracy: RegimeAccuracy[];
  failurePatterns: FailurePattern[];
  stress: StressSimulation;
  monteCarlo: MonteCarloResult;
  humanReviewQueue: TrackedAiRecommendation[];
  consistencyWarningsJa: string[];
  overtradingNoteJa: string | null;
  journalRecent: PerformanceJournalDay[];
  benchmarkLabelsJa: string[];
};
