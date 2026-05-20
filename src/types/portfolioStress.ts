import type { CrisisCorrelationReport } from './crisisCorrelation';
import type { FactorExposure } from './portfolioConstruction';
import type { MarketRegimeId } from './marketRegime';

export type StressHealthStatus = 'green' | 'yellow' | 'red';
export type CrisisOverrideMode = 'normal' | 'defensive' | 'crisis';

export interface CorrelationShockResult {
  baselineAvgCorrelation: number;
  shockedAvgCorrelation: number;
  shockMultiplier: number;
  portfolioVolBaselinePct: number;
  portfolioVolShockedPct: number;
  noteJa: string;
}

export interface SectorContagionResult {
  worstSector: string;
  spilloverLossPct: number;
  sectorImpacts: { sector: string; weightPct: number; contagionPct: number }[];
  noteJa: string;
}

export interface TailMonteCarloResult {
  paths: number;
  horizonDays: number;
  p1ReturnPct: number;
  p5ReturnPct: number;
  medianReturnPct: number;
  probTailLossPct: number;
  noteJa: string;
}

export interface LiquidityCascadeResult {
  cascadeLossPct: number;
  liquidationDays: number;
  symbolsAtRisk: string[];
  noteJa: string;
}

export interface HiddenFactorConcentration {
  herfindahl: number;
  dominantFactor: string;
  dominantExposure: number;
  hiddenScore: number;
  noteJa: string;
}

export interface ExposureOverlap {
  groupLabelJa: string;
  symbols: string[];
  combinedWeightPct: number;
  overlapScore: number;
}

export interface VolatilityClustering {
  clusterScore: number;
  volAutocorrelation: number;
  elevated: boolean;
  noteJa: string;
}

export interface DrawdownAcceleration {
  currentDrawdownPct: number;
  acceleration: number;
  alert: boolean;
  noteJa: string;
}

export interface PortfolioConvexity {
  upsideCapture: number;
  downsideCapture: number;
  convexityScore: number;
  noteJa: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  weight: number;
}

export interface DependencyGraph {
  nodes: string[];
  edges: DependencyEdge[];
  maxCentralitySymbol: string;
  noteJa: string;
}

export interface CrisisAllocationOverride {
  mode: CrisisOverrideMode;
  targetCashPct: number;
  maxEquityPct: number;
  blockedSectors: string[];
  noteJa: string;
}

export interface DeleveragingAction {
  symbol: string;
  trimWeightPct: number;
  trimSharesEstimate: number;
  priority: number;
  reasonJa: string;
}

export interface EmergencyDeleveraging {
  active: boolean;
  targetReductionPct: number;
  actions: DeleveragingAction[];
  noteJa: string;
}

export interface DynamicCashBuffer {
  minCashPct: number;
  recommendedCashMYR: number;
  currentCashPct: number;
  noteJa: string;
}

export interface StressVarEs {
  var95Pct: number;
  var99Pct: number;
  expectedShortfall95Pct: number;
  stressedVar95Pct: number;
  noteJa: string;
}

export interface RiskOfRuin {
  ruinProbabilityPct: number;
  horizonYears: number;
  maxToleratedDrawdownPct: number;
  noteJa: string;
}

export interface PortfolioStressReport {
  generatedAt: string;
  correlationShock: CorrelationShockResult;
  sectorContagion: SectorContagionResult;
  tailMonteCarlo: TailMonteCarloResult;
  liquidityCascade: LiquidityCascadeResult;
  hiddenFactors: HiddenFactorConcentration;
  exposureOverlaps: ExposureOverlap[];
  volatilityClustering: VolatilityClustering;
  drawdownAcceleration: DrawdownAcceleration;
  convexity: PortfolioConvexity;
  dependencyGraph: DependencyGraph;
  crisisOverride: CrisisAllocationOverride;
  deleveraging: EmergencyDeleveraging;
  cashBuffer: DynamicCashBuffer;
  stressVarEs: StressVarEs;
  riskOfRuin: RiskOfRuin;
  crisisCorrelation: CrisisCorrelationReport | null;
  systemicStressScore: number;
  executionGateActive: boolean;
  healthStatus: StressHealthStatus;
  verdictJa: string;
}

export interface PortfolioStressInput {
  positions: import('./portfolioConstruction').PortfolioPositionAnalysis[];
  totalPortfolioValueMYR: number;
  cashBalanceMYR: number;
  portfolioDrawdownPct?: number;
  regimeId?: MarketRegimeId;
  factorExposures?: FactorExposure[];
  herfindahlIndex?: number;
  crisisCorrelation?: CrisisCorrelationReport | null;
  equityCurve?: { date: string; portfolioValueMYR: number }[];
}
