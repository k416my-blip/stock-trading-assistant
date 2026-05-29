import type { ConciergeMarketRegimeId } from './globalMarketAnalysis';
import type { Market } from './index';

export type StrategyAction = 'buy' | 'reduce' | 'hold' | 'avoid' | 'watch';

export type TacticalMode = 'defensive' | 'balanced' | 'aggressive';

export type EntryTimingKind =
  | 'breakout'
  | 'pullback'
  | 'oversold_rebound'
  | 'trend_continuation'
  | 'none';

export type ExitTimingKind =
  | 'take_profit_zone'
  | 'stop_loss_risk'
  | 'trend_exhaustion'
  | 'none';

export type StrategyIntent = 'watch' | 'action';

export type StrategyRiskReward = {
  expectedUpsidePct: number;
  downsideRiskPct: number;
  rewardRiskRatio: number | null;
  summaryJa: string;
};

export type StrategySymbolRecommendation = {
  symbol: string;
  market: Market;
  displayLabelJa: string;
  action: StrategyAction;
  intent: StrategyIntent;
  confidencePct: number;
  entryTiming: EntryTimingKind;
  exitTiming: ExitTimingKind;
  riskReward: StrategyRiskReward;
  analystExplanationJa: string;
  whyProposedJa: string;
  positionSizePct: { conservative: number; standard: number; aggressive: number };
  opportunityScore: number;
  threatScore: number;
  /** Phase B — ルール×AI 統合スコア（ルール action は維持） */
  hybrid?: StrategySymbolHybridScore;
  fusedDisplayAction?: StrategyAction;
  fusedDisplayConfidencePct?: number;
};

/** Phase B — OpenAI 第二評価 + ルール統合 */
export type StrategySymbolHybridScore = {
  ruleScore: number;
  aiScore: number;
  finalScore: number;
  ruleAction: StrategyAction;
  aiAction: import('./aiSecondEvaluator').AiSecondEvaluatorAction;
  aiConfidencePct: number;
  fusedAction: import('./aiSecondEvaluator').AiSecondEvaluatorAction;
  fusedConfidencePct: number;
  rationaleJa?: string;
  rsi14?: number | null;
  rsiSource?: string;
};

export type HybridSecondEvaluatorSummary = {
  generatedAt: string;
  source: 'openai' | 'cache' | 'mock_fallback' | 'skipped';
  symbolCount: number;
  ruleWeightPct: number;
  aiWeightPct: number;
};

export type PortfolioAllocationAdvice = {
  sectorBalanceJa: string;
  concentrationJa: string;
  recommendedCashRatioPct: number;
  cashRatioRationaleJa: string;
};

export type MacroStrategyNote = {
  labelJa: string;
  impactJa: string;
};

export type StrategyJournalEntry = {
  id: string;
  at: string;
  symbol: string | null;
  action: StrategyAction;
  whyProposedJa: string;
  outcomeNoteJa: string | null;
};

export type StrategyBacktestNote = {
  labelJa: string;
  detailJa: string;
  sampleSize: number;
};

export type StrategyExecutionBundle = {
  generatedAt: string;
  tacticalMode: TacticalMode;
  regimeId: ConciergeMarketRegimeId | 'unknown';
  regimeStrategyJa: string;
  todayRecommendations: StrategySymbolRecommendation[];
  dangerAvoid: StrategySymbolRecommendation[];
  watchList: StrategySymbolRecommendation[];
  highExpectancy: StrategySymbolRecommendation[];
  opportunities: Array<{ rank: number; symbol: string; labelJa: string; score: number }>;
  threats: Array<{ rank: number; symbol: string; labelJa: string; score: number }>;
  allocation: PortfolioAllocationAdvice;
  overallConfidencePct: number;
  macroNotes: MacroStrategyNote[];
  learningFeedbackJa: string[];
  predictionAccuracyJa: string | null;
  backtest: StrategyBacktestNote | null;
  journalRecent: StrategyJournalEntry[];
  cooldownActive: boolean;
  cooldownNoteJa: string | null;
  /** Phase B — OpenAI 第二評価者メタデータ */
  hybridSecondEvaluator?: HybridSecondEvaluatorSummary | null;
  /** 全保有銘柄 AI 評価ランキング */
  portfolioAiEvaluation?: import('./portfolioAiEvaluation').PortfolioAiEvaluationBundle | null;
};

export type BuildStrategyExecutionInput = {
  evidenceSymbols: import('./conciergeEvidence').ConciergeSymbolEvidence[];
  globalMarket: import('./globalMarketAnalysis').GlobalMarketAnalysisBundle | null;
  portfolioIntel: import('./portfolioIntelligence').PortfolioIntelligenceBundle | null;
  symbolWeightPct: Record<string, number>;
  tacticalMode: TacticalMode;
  regimeId: ConciergeMarketRegimeId | null;
  cashRatioPctEstimate?: number;
};
