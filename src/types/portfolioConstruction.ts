import type { CrisisCorrelationReport } from './crisisCorrelation';
import type { CrossAssetPortfolioGuidance } from './crossAssetFlow';
import type { Market, PortfolioPosition } from './index';
import type { MarketRegimeResult, SectorTheme } from './marketRegime';

export type ConcentrationSeverity = 'ok' | 'watch' | 'high' | 'critical';

export type InvestmentTheme =
  | 'income'
  | 'growth'
  | 'defensive'
  | 'cyclical'
  | 'index_passive'
  | 'commodity';

export interface PortfolioPositionAnalysis {
  positionId: string;
  symbol: string;
  name: string;
  market: Market;
  sector: SectorTheme;
  investmentTheme: InvestmentTheme;
  weightPct: number;
  valueMYR: number;
  betaProxy: number;
  liquidityScore: number;
  maxLiquidWeightPct: number;
  correlationClusterId?: string;
}

export interface SectorExposure {
  sector: SectorTheme;
  weightPct: number;
  positionCount: number;
  severity: ConcentrationSeverity;
}

export interface ThemeOverlapGroup {
  theme: InvestmentTheme;
  symbols: string[];
  combinedWeightPct: number;
  severity: ConcentrationSeverity;
}

export interface CorrelatedPair {
  symbolA: string;
  symbolB: string;
  correlation: number;
}

export interface HeatMapRow {
  label: string;
  weightPct: number;
  /** 0–4 表示強度（UI色分け用） */
  intensity: number;
  severity: ConcentrationSeverity;
}

export interface FactorExposure {
  factor: 'value' | 'growth' | 'momentum' | 'quality' | 'size';
  labelJa: string;
  exposure: number;
  /** -100〜+100 */
  tilt: 'underweight' | 'neutral' | 'overweight';
}

export interface StressScenario {
  id: string;
  labelJa: string;
  portfolioImpactPct: number;
  estimatedLossMYR: number;
}

export interface PortfolioConstructionWarning {
  id: string;
  severity: ConcentrationSeverity;
  titleJa: string;
  detailJa: string;
}

export interface PortfolioConstructionReport {
  computedAt: string;
  positionCount: number;
  totalValueMYR: number;
  positions: PortfolioPositionAnalysis[];
  sectorExposures: SectorExposure[];
  themeOverlaps: ThemeOverlapGroup[];
  correlatedPairs: CorrelatedPair[];
  sectorHeatMap: HeatMapRow[];
  themeHeatMap: HeatMapRow[];
  portfolioBeta: number;
  maxPortfolioBeta: number;
  betaWithinLimit: boolean;
  betaReductionSuggestionPct: number;
  factorExposures: FactorExposure[];
  herfindahlIndex: number;
  macroRiskReductionPct: number;
  macroRiskNoteJa: string;
  stressTests: StressScenario[];
  crisisCorrelation: CrisisCorrelationReport;
  crossAssetGuidance: CrossAssetPortfolioGuidance;
  dynamicMaxPortfolioBeta: number;
  totalExposureReductionPct: number;
  warnings: PortfolioConstructionWarning[];
  healthScore: number;
}

export interface PortfolioConstructionInput {
  portfolio: PortfolioPosition[];
  totalPortfolioValueMYR: number;
  regime?: MarketRegimeResult;
  maxPortfolioBeta?: number;
  /** ピーク比ドローダウン%（練習履歴等） */
  portfolioDrawdownPct?: number;
}
