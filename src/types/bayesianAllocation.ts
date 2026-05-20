import type { Market } from './index';
import type { MarketRegimeId } from './marketRegime';
import type { QuantDataSource } from './quantValidation';
import type { SymbolWeight } from './portfolioOptimization';

export type BayesianAllocationMethodId =
  | 'black_litterman'
  | 'fractional_kelly'
  | 'ewma_risk_parity'
  | 'rolling_shrink_mvo'
  | 'stability_penalized';

export interface EwmaCovarianceResult {
  lambda: number;
  matrix: number[][];
  halflifeDays: number;
  noteJa: string;
}

export interface RollingShrinkageResult {
  windowDays: number;
  windowsUsed: number;
  avgShrinkageIntensity: number;
  matrix: number[][];
  noteJa: string;
}

export interface BlackLittermanResult {
  tau: number;
  priorReturns: number[];
  posteriorReturns: number[];
  viewConfidence: number;
  weights: SymbolWeight[];
  noteJa: string;
}

export interface FractionalKellyResult {
  fraction: number;
  rawFractions: { symbol: string; kelly: number; fractional: number }[];
  weights: SymbolWeight[];
  noteJa: string;
}

export interface WeightStabilityResult {
  penaltyLambda: number;
  turnoverFromPriorPct: number;
  stabilityScore: number;
  weights: SymbolWeight[];
  noteJa: string;
}

export interface RegimePersistenceResult {
  currentRegime: MarketRegimeId;
  persistenceScore: number;
  expectedDaysInRegime: number;
  transitionRiskPct: number;
  dominantScoreMargin: number;
  noteJa: string;
}

export interface DynamicUncertaintyResult {
  baseTau: number;
  scaledTau: number;
  uncertaintyMultiplier: number;
  viewOmegaScale: number;
  noteJa: string;
}

export interface BayesianConfidenceInterval {
  symbol: string;
  weightPct: number;
  weightLowerPct: number;
  weightUpperPct: number;
  returnMeanPct: number;
  returnLowerPct: number;
  returnUpperPct: number;
}

export interface SensitivityPerturbation {
  parameter: string;
  perturbationPct: number;
  maxWeightChangePct: number;
  avgWeightChangePct: number;
}

export interface OptimizationSensitivityResult {
  perturbations: SensitivityPerturbation[];
  fragilityScore: number;
  noteJa: string;
}

export interface AllocationRobustnessRank {
  methodId: BayesianAllocationMethodId;
  methodLabelJa: string;
  rank: number;
  compositeScore: number;
  stabilityScore: number;
  sensitivityScore: number;
  ciWidthScore: number;
  weights: SymbolWeight[];
}

export interface BayesianAllocationInput {
  symbols: string[];
  markets: Market[];
  returnMatrix: number[][];
  currentWeightsPct: Map<string, number>;
  liquidityMaxPct: Map<string, number>;
  sectors: Map<string, string>;
  regimeId: MarketRegimeId;
  regimeScores: Partial<Record<MarketRegimeId, number>>;
  regimeConfidence: number;
  volatilityProxyPct: number;
}

export interface BayesianAllocationReport {
  generatedAt: string;
  dataSource: QuantDataSource;
  tradingDays: number;
  ewmaCovariance: EwmaCovarianceResult;
  rollingShrinkage: RollingShrinkageResult;
  blackLitterman: BlackLittermanResult;
  fractionalKelly: FractionalKellyResult;
  weightStability: WeightStabilityResult;
  regimePersistence: RegimePersistenceResult;
  dynamicUncertainty: DynamicUncertaintyResult;
  confidenceIntervals: BayesianConfidenceInterval[];
  sensitivity: OptimizationSensitivityResult;
  robustnessRanking: AllocationRobustnessRank[];
  recommendedMethodId: BayesianAllocationMethodId;
  recommendedWeights: SymbolWeight[];
  verdictJa: string;
}
