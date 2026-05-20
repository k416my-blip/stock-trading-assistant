import type { Market } from './index';
import type { MarketRegimeId } from './marketRegime';

export type QuantDataSource = 'live_api' | 'cache' | 'synthetic_fallback';

export interface AdjustedOHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  /** 累積分割調整係数 */
  splitAdjFactor: number;
  /** 累積配当調整係数 */
  dividendAdjFactor: number;
}

export interface SymbolOHLCVSeries {
  symbol: string;
  market: Market;
  bars: AdjustedOHLCVBar[];
  fetchedAt: string;
  adjustMode: 'all' | 'none';
  minHistoryDays: number;
}

export interface SurvivorshipBiasReport {
  pointInTimeSafe: boolean;
  currentUniverseOnly: boolean;
  symbolsIncluded: string[];
  symbolsExcluded: { symbol: string; reasonJa: string }[];
  warningJa: string;
}

export interface RegimeInstabilityResult {
  transitionCount: number;
  unstablePeriods: number;
  returnStdDuringTransitions: number;
  returnStdStable: number;
  instabilityRatio: number;
  noteJa: string;
}

export interface MonteCarloResult {
  paths: number;
  medianReturnPct: number;
  p5ReturnPct: number;
  p95ReturnPct: number;
  probLossPct: number;
  noteJa: string;
}

export interface TailEventResult {
  scenario: string;
  injectedShockPct: number;
  portfolioImpactPct: number;
  maxDrawdownPct: number;
  noteJa: string;
}

export interface ExecutionDelayResult {
  delayDays: number;
  annualizedReturnPct: number;
  sharpe: number;
  dragVsImmediatePct: number;
}

export interface GapRiskResult {
  avgGapPct: number;
  maxGapPct: number;
  gapLossContributionPct: number;
  gapDaysCount: number;
  noteJa: string;
}

export interface LiquidityVacuumResult {
  vacuumDays: number;
  extraSlippageDragPct: number;
  worstDayImpactPct: number;
  noteJa: string;
}

export interface PsychologicalStressResult {
  maxConsecutiveDrawdownDays: number;
  maxRecoveryDays: number;
  breakpointsHit: { thresholdPct: number; daysToHit: number | null }[];
  stressScore: number;
  noteJa: string;
}

export interface RealQuantValidationReport {
  computedAt: string;
  dataSource: QuantDataSource;
  symbolsLoaded: number;
  tradingDays: number;
  survivorship: SurvivorshipBiasReport;
  regimeInstability: RegimeInstabilityResult;
  monteCarlo: MonteCarloResult;
  tailEvents: TailEventResult[];
  executionDelays: ExecutionDelayResult[];
  gapRisk: GapRiskResult;
  liquidityVacuum: LiquidityVacuumResult;
  psychologicalStress: PsychologicalStressResult;
  robustUnderChaos: boolean;
  verdictJa: string;
}

export interface OHLCVDataset {
  series: SymbolOHLCVSeries[];
  alignedDates: string[];
  survivorship: SurvivorshipBiasReport;
}
