import type { MarketRegimeId } from './marketRegime';

export interface EquityPoint {
  date: string;
  dayIndex: number;
  value: number;
  drawdownPct: number;
  exposurePct: number;
}

export interface WalkForwardWindow {
  windowId: number;
  trainStartIdx: number;
  testEndIdx: number;
  systemReturnPct: number;
  benchmarkReturnPct: number;
  alphaPct: number;
  beatBenchmark: boolean;
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  avgSystemReturnPct: number;
  avgBenchmarkReturnPct: number;
  hitRatePct: number;
  windowCount: number;
}

export interface RegimePerformanceRow {
  regimeId: MarketRegimeId;
  labelJa: string;
  days: number;
  returnPct: number;
  volatilityPct: number;
  sharpe: number;
}

export interface StressPeriodResult {
  id: string;
  labelJa: string;
  returnPct: number;
  benchmarkReturnPct: number;
  maxDrawdownPct: number;
  recoveryDays: number;
  slippageAdjustedReturnPct: number;
}

export interface TurnoverImpactAnalysis {
  turnoverPctAnnualized: number;
  grossReturnPct: number;
  netReturnPct: number;
  turnoverDragPct: number;
  rebalanceCount: number;
  noteJa: string;
}

export interface RiskAdjustedMetrics {
  sharpe: number;
  sortino: number;
  calmar: number;
  annualizedReturnPct: number;
  annualizedVolPct: number;
  benchmarkSharpe: number;
  benchmarkCalmar: number;
}

export interface MaxDrawdownAnalysis {
  maxDrawdownPct: number;
  peakDate: string;
  troughDate: string;
  recoveryDays: number;
  benchmarkMaxDrawdownPct: number;
}

export interface ExposureHeatPoint {
  date: string;
  sectorWeights: { sector: string; weightPct: number }[];
  grossExposurePct: number;
}

export interface FactorAttributionRow {
  factor: string;
  labelJa: string;
  contributionPct: number;
}

export interface SurvivalAnalysisResult {
  windowsSurvivedPct: number;
  beatBenchmarkPct: number;
  positiveCalmarWindowsPct: number;
  maxConsecutiveLossWindows: number;
  medianWindowReturnPct: number;
  noteJa: string;
}

export interface HistoricalValidationReport {
  computedAt: string;
  tradingDays: number;
  universeSize: number;
  walkForward: WalkForwardResult;
  regimePerformance: RegimePerformanceRow[];
  stressTests: StressPeriodResult[];
  turnoverImpact: TurnoverImpactAnalysis;
  riskMetrics: RiskAdjustedMetrics;
  maxDrawdown: MaxDrawdownAnalysis;
  exposureHeatTimeline: ExposureHeatPoint[];
  factorAttribution: FactorAttributionRow[];
  survivalAnalysis: SurvivalAnalysisResult;
  systemEquityCurve: EquityPoint[];
  benchmarkEquityCurve: EquityPoint[];
  validationVerdictJa: string;
  improvesRiskAdjustedPreservation: boolean;
}
