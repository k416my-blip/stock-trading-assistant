import type { Market } from './index';
import type { MarketRegimeId } from './marketRegime';
import type { QuantDataSource } from './quantValidation';

export type OptimizationMethodId =
  | 'risk_parity'
  | 'min_variance'
  | 'cvar'
  | 'kelly_capped'
  | 'regime_blend';

export interface SymbolWeight {
  symbol: string;
  market: Market;
  weightPct: number;
}

export interface CovarianceEstimate {
  symbols: string[];
  sampleCov: number[][];
  shrunkCov: number[][];
  shrinkageIntensity: number;
  conditionNumber: number;
  avgPairwiseCorr: number;
  noteJa: string;
}

export interface OptimizedAllocation {
  methodId: OptimizationMethodId;
  methodLabelJa: string;
  weights: SymbolWeight[];
  cashWeightPct: number;
  expectedVolPct: number;
  expectedReturnPct: number;
  cvar95Pct: number;
  sharpe: number;
  noteJa: string;
}

export interface KellyConstraintResult {
  rawKellyFractions: { symbol: string; fraction: number }[];
  cappedWeights: SymbolWeight[];
  maxKellyFraction: number;
  noteJa: string;
}

export interface TurnoverConstrainedRebalance {
  maxTurnoverPct: number;
  turnoverUsedPct: number;
  feasibleWeights: SymbolWeight[];
  actions: {
    symbol: string;
    currentPct: number;
    targetPct: number;
    feasiblePct: number;
    deltaPct: number;
    action: 'buy' | 'sell' | 'hold';
  }[];
  noteJa: string;
}

export interface ExposureNeutralResult {
  portfolioBetaBefore: number;
  portfolioBetaAfter: number;
  targetBeta: number;
  sectorImbalanceBefore: number;
  sectorImbalanceAfter: number;
  noteJa: string;
}

export interface MonteCarloRobustnessResult {
  paths: number;
  medianReturnPct: number;
  p5ReturnPct: number;
  p95ReturnPct: number;
  probLossPct: number;
  medianSharpe: number;
  robustnessScore: number;
  noteJa: string;
}

export interface PortfolioOptimizationInput {
  symbols: string[];
  markets: Market[];
  /** n × T aligned daily returns */
  returnMatrix: number[][];
  currentWeightsPct: Map<string, number>;
  liquidityMaxPct: Map<string, number>;
  betas: Map<string, number>;
  sectors: Map<string, string>;
  regimeId: MarketRegimeId;
  maxTurnoverPct?: number;
}

export interface PortfolioOptimizationReport {
  generatedAt: string;
  dataSource: QuantDataSource;
  tradingDays: number;
  covariance: CovarianceEstimate;
  allocations: OptimizedAllocation[];
  recommendedMethodId: OptimizationMethodId;
  recommendedWeights: SymbolWeight[];
  kelly: KellyConstraintResult;
  regimeNoteJa: string;
  turnoverRebalance: TurnoverConstrainedRebalance;
  exposureNeutral: ExposureNeutralResult;
  monteCarloRobustness: MonteCarloRobustnessResult;
  verdictJa: string;
}
