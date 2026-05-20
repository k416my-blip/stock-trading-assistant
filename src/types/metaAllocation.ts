import type { Market } from './index';
import type { MarketRegimeId } from './marketRegime';
import type { QuantDataSource } from './quantValidation';
import type { SymbolWeight } from './portfolioOptimization';

export type EnsembleAllocatorId =
  | 'black_litterman'
  | 'risk_parity'
  | 'cvar'
  | 'min_variance'
  | 'stability_penalized';

export type FailSafeMode = 'equal_weight' | 'min_variance' | 'stability_penalized';

export interface AllocatorOutput {
  allocatorId: EnsembleAllocatorId;
  labelJa: string;
  weights: SymbolWeight[];
  weightVector: number[];
  modelScore: number;
  confidence: number;
}

export interface DynamicModelWeight {
  allocatorId: EnsembleAllocatorId;
  labelJa: string;
  priorWeight: number;
  dynamicWeight: number;
  regimeBoost: number;
}

export interface RegimeAllocatorSelection {
  regimeId: MarketRegimeId;
  primaryAllocator: EnsembleAllocatorId;
  secondaryAllocator: EnsembleAllocatorId;
  suppressedAllocators: EnsembleAllocatorId[];
  noteJa: string;
}

export interface AllocatorDisagreementResult {
  score: number;
  maxPairwiseL1Pct: number;
  avgPairwiseL1Pct: number;
  noteJa: string;
}

export interface ConfidenceBlendResult {
  blendedWeights: SymbolWeight[];
  effectiveConfidence: number;
  noteJa: string;
}

export interface BayesianModelAveragingResult {
  posteriorWeights: { allocatorId: EnsembleAllocatorId; posterior: number }[];
  bmaWeights: SymbolWeight[];
  noteJa: string;
}

export interface AllocationEntropyResult {
  entropy: number;
  normalizedEntropy: number;
  effectiveN: number;
  noteJa: string;
}

export interface ModelDiversificationResult {
  entropy: number;
  effectiveModels: number;
  herfindahl: number;
  noteJa: string;
}

export interface FailSafeFallbackResult {
  triggered: boolean;
  mode: FailSafeMode;
  reasonJa: string;
  weights: SymbolWeight[];
}

export interface MetaRobustnessResult {
  score: number;
  disagreementComponent: number;
  entropyComponent: number;
  modelDivComponent: number;
  bmaStabilityComponent: number;
  noteJa: string;
}

export interface MetaAllocationInput {
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

export interface MetaAllocationReport {
  generatedAt: string;
  dataSource: QuantDataSource;
  tradingDays: number;
  allocators: AllocatorOutput[];
  dynamicModelWeights: DynamicModelWeight[];
  regimeSelection: RegimeAllocatorSelection;
  disagreement: AllocatorDisagreementResult;
  confidenceBlend: ConfidenceBlendResult;
  bayesianModelAveraging: BayesianModelAveragingResult;
  allocationEntropy: AllocationEntropyResult;
  modelDiversification: ModelDiversificationResult;
  failSafe: FailSafeFallbackResult;
  metaRobustness: MetaRobustnessResult;
  finalWeights: SymbolWeight[];
  verdictJa: string;
}
