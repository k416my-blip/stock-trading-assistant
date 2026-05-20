import type { Currency, Market, PortfolioPosition, PositionSizingResult, TradeRecord } from './index';
import type { AdaptiveExecutionReport } from './adaptiveExecution';
import type { DataIntegrityReport } from './dataIntegrity';
import type { BehavioralRiskReport } from './behavioralRisk';
import type { MetaCapitalReport } from './metaCapital';
import type { ModelStabilityReport } from './modelStability';
import type { PortfolioStressReport } from './portfolioStress';
import type { MarketRegimeResult } from './marketRegime';
import type { PortfolioConstructionReport } from './portfolioConstruction';
import type { StockRecommendation } from './recommendation';
import type { TechnicalSnapshot, TradeSuggestion } from './index';

export type ExecutionStageId = 'signal' | 'probe' | 'scale' | 'full';

export interface EntryStage {
  stageId: ExecutionStageId;
  labelJa: string;
  sharePct: number;
  shares: number;
  limitPrice: number;
  conditionsJa: string;
}

export interface StagedEntryPlan {
  stages: EntryStage[];
  totalTargetShares: number;
  totalTargetMYR: number;
  rationaleJa: string;
}

export type ExitTriggerId =
  | 'trailing_stop'
  | 'volatility_stop'
  | 'regime_exit'
  | 'thesis_break';

export interface ExitRecommendation {
  triggerId: ExitTriggerId;
  labelJa: string;
  active: boolean;
  suggestedActionJa: string;
  exitPct: number;
  priceLevel?: number;
}

export interface TurnoverControl {
  turnoverPct30d: number;
  maxTurnoverPct: number;
  withinLimit: boolean;
  blockNewBuys: boolean;
  noteJa: string;
}

export interface TransactionCostModel {
  explicitFeeMYR: number;
  spreadCostEstimateMYR: number;
  slippageEstimateMYR: number;
  totalCostMYR: number;
  costBps: number;
  roundTripCostBps: number;
  noteJa: string;
}

export interface SignalDecayScore {
  score: number;
  ageDays: number;
  entryScore?: number;
  currentScore?: number;
  decayPct: number;
  labelJa: string;
  stale: boolean;
}

export interface RebalanceAction {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  currentWeightPct: number;
  targetWeightPct: number;
  deltaWeightPct: number;
  suggestedShares: number;
  priority: number;
}

export interface RebalancePlan {
  actions: RebalanceAction[];
  estimatedTurnoverPct: number;
  rationaleJa: string;
}

export interface CashManagementAdvice {
  cashBalanceMYR: number;
  currentCashPct: number;
  targetCashPct: number;
  minCashPct: number;
  deployableMYR: number;
  reserveMYR: number;
  noteJa: string;
}

export interface ExposureThrottle {
  currentExposurePct: number;
  maxExposurePct: number;
  throttleReductionPct: number;
  headroomMYR: number;
  blocked: boolean;
  noteJa: string;
}

export interface RiskBudgetLine {
  symbol: string;
  riskMYR: number;
  riskPctOfBudget: number;
}

export interface RiskBudgetAllocation {
  totalRiskBudgetMYR: number;
  usedRiskMYR: number;
  availableRiskMYR: number;
  perPosition: RiskBudgetLine[];
  noteJa: string;
}

export interface TradeGateViolation {
  id: string;
  severity: 'watch' | 'high' | 'critical';
  messageJa: string;
}

export interface TradeGateResult {
  allowed: boolean;
  adjustedShares?: number;
  violations: TradeGateViolation[];
  warnings: string[];
}

export interface InstitutionalRiskReport {
  computedAt: string;
  entryPlan?: StagedEntryPlan;
  exitRecommendations: ExitRecommendation[];
  turnover: TurnoverControl;
  transactionCost?: TransactionCostModel;
  signalDecay?: SignalDecayScore;
  rebalancePlan?: RebalancePlan;
  cashManagement: CashManagementAdvice;
  exposureThrottle: ExposureThrottle;
  riskBudget: RiskBudgetAllocation;
}

export interface TradeIntent {
  symbol: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  shares: number;
  price: number;
  brokerageFee?: number;
}

export interface InstitutionalRiskInput {
  cashBalanceMYR: number;
  totalPortfolioValueMYR: number;
  totalCapitalMYR: number;
  riskPerTradePct: number;
  portfolio: PortfolioPosition[];
  trades: TradeRecord[];
  regime: MarketRegimeResult;
  portfolioDrawdownPct?: number;
  constructionReport?: PortfolioConstructionReport;
  symbol?: string;
  stockPrice?: number;
  currency?: Currency;
  market?: Market;
  technicals?: TechnicalSnapshot;
  recommendation?: StockRecommendation | null;
  sizing?: PositionSizingResult | null;
  tradeSuggestion?: TradeSuggestion | null;
  positionOpenedAt?: string;
  adaptiveExecution?: AdaptiveExecutionReport | null;
  dataIntegrity?: DataIntegrityReport | null;
  portfolioStress?: PortfolioStressReport | null;
  behavioralRisk?: BehavioralRiskReport | null;
  modelStability?: ModelStabilityReport | null;
  metaCapital?: MetaCapitalReport | null;
}
