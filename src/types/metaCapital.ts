import type { MarketRegimeId, MarketRegimeResult } from './marketRegime';

export type StrategyId =
  | 'core_equity'
  | 'adaptive_alpha'
  | 'shadow_research'
  | 'bayesian_blend'
  | 'defensive_cash';

export type MetaCapitalSeverity = 'info' | 'watch' | 'high' | 'critical';

export interface MetaCapitalAlert {
  id: string;
  severity: MetaCapitalSeverity;
  titleJa: string;
  detailJa: string;
}

export interface StrategyCapitalSlice {
  strategyId: StrategyId;
  labelJa: string;
  targetPct: number;
  capitalMYR: number;
  dynamicWeight: number;
  confidence: number;
}

export interface DynamicStrategyWeighting {
  weights: { strategyId: StrategyId; labelJa: string; weightPct: number; regimeBoost: number }[];
  noteJa: string;
}

export interface CrossStrategyCorrelation {
  matrix: { a: StrategyId; b: StrategyId; correlation: number }[];
  maxCorrelation: number;
  noteJa: string;
}

export interface CapitalConcentrationLimits {
  maxStrategyPct: number;
  breached: boolean;
  topStrategyId: StrategyId;
  topStrategyPct: number;
  noteJa: string;
}

export interface StrategyDrawdownThrottle {
  strategyId: StrategyId;
  drawdownPct: number;
  throttleFactor: number;
  active: boolean;
  noteJa: string;
}

export interface RegimeStrategySwitch {
  regimeId: MarketRegimeId;
  primaryStrategy: StrategyId;
  secondaryStrategy: StrategyId;
  suppressed: StrategyId[];
  noteJa: string;
}

export interface AlphaDecayTracking {
  strategyId: StrategyId;
  decayScore: number;
  rollingSharpe: number;
  priorSharpe: number;
  noteJa: string;
}

export interface PerformanceAttribution {
  strategyId: StrategyId;
  labelJa: string;
  returnContributionPct: number;
  weightPct: number;
}

export interface EnsembleDisagreement {
  score: number;
  liveVsShadowL1Pct: number;
  noteJa: string;
}

export interface StrategyDiversification {
  score: number;
  effectiveStrategies: number;
  herfindahl: number;
  noteJa: string;
}

export interface MetaKellyCap {
  rawKellyFraction: number;
  cappedFraction: number;
  capLimit: number;
  noteJa: string;
}

export interface StrategyTurnoverPenalty {
  turnoverL1Pct: number;
  penaltyScore: number;
  noteJa: string;
}

export interface CapitalRecycling {
  active: boolean;
  fromStrategy: StrategyId;
  toStrategy: StrategyId;
  recycledPct: number;
  noteJa: string;
}

export interface CrisisAllocatorOverride {
  active: boolean;
  defensiveBoostPct: number;
  equityTrimPct: number;
  noteJa: string;
}

export interface ShadowAllocatorSimulation {
  slices: StrategyCapitalSlice[];
  totalMYR: number;
  noteJa: string;
}

export interface AllocationSnapshot {
  id: string;
  capturedAt: string;
  slices: StrategyCapitalSlice[];
  stabilityScore: number;
}

export interface ExposureOverlap {
  strategyA: StrategyId;
  strategyB: StrategyId;
  overlapPct: number;
  noteJa: string;
}

export interface LiveShadowDivergence {
  divergencePct: number;
  alert: boolean;
  noteJa: string;
}

export interface ConfidenceCalibration {
  strategyId: StrategyId;
  allocatedPct: number;
  calibratedConfidence: number;
  gapPct: number;
  noteJa: string;
}

export interface CapitalPreservationPriority {
  priorityScore: number;
  minCashTargetPct: number;
  currentCashPct: number;
  preservationActive: boolean;
  noteJa: string;
}

export interface MetaCapitalControlState {
  version: 1;
  updatedAt: string;
  snapshots: AllocationSnapshot[];
  lastSlices: StrategyCapitalSlice[];
}

export interface StrategyMetrics {
  strategyId: StrategyId;
  returnEwmaPct: number;
  drawdownPct: number;
  sharpeProxy: number;
  turnoverPct30d: number;
}

export interface MetaCapitalInput {
  totalCapitalMYR: number;
  cashBalanceMYR: number;
  regime: MarketRegimeResult;
  strategyMetrics: StrategyMetrics[];
  controlState?: MetaCapitalControlState;
  metaRobustnessScore?: number;
  disagreementScore?: number;
}

export interface MetaCapitalReport {
  generatedAt: string;
  strategyAllocation: StrategyCapitalSlice[];
  dynamicWeighting: DynamicStrategyWeighting;
  crossStrategyCorrelation: CrossStrategyCorrelation;
  concentrationLimits: CapitalConcentrationLimits;
  drawdownThrottles: StrategyDrawdownThrottle[];
  regimeSwitch: RegimeStrategySwitch;
  alphaDecay: AlphaDecayTracking[];
  performanceAttribution: PerformanceAttribution[];
  ensembleDisagreement: EnsembleDisagreement;
  strategyDiversification: StrategyDiversification;
  metaKellyCap: MetaKellyCap;
  turnoverPenalty: StrategyTurnoverPenalty;
  capitalRecycling: CapitalRecycling;
  crisisOverride: CrisisAllocatorOverride;
  shadowSimulation: ShadowAllocatorSimulation;
  snapshots: AllocationSnapshot[];
  exposureOverlaps: ExposureOverlap[];
  liveShadowDivergence: LiveShadowDivergence;
  confidenceCalibration: ConfidenceCalibration[];
  capitalPreservation: CapitalPreservationPriority;
  alerts: MetaCapitalAlert[];
  diversificationScore: number;
  allocationAllowed: boolean;
  healthStatus: 'green' | 'yellow' | 'red';
  verdictJa: string;
}
