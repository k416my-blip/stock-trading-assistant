import type { SectorTheme } from './marketRegime';

export type LiquidityRegimeId = 'expansion' | 'neutral' | 'contraction';
export type CapitalFlowId = 'risk_on' | 'neutral' | 'risk_off';
export type FactorRotationId =
  | 'value_to_growth'
  | 'growth_to_value'
  | 'defensive_rotation'
  | 'cyclical_rotation'
  | 'stable';

export interface CrossAssetIndicators {
  dxyProxy: number;
  us10yProxy: number;
  vixProxy: number;
  moveProxy: number;
  hySpreadProxy: number;
  computedAt: string;
}

export interface CrossAssetFlowSnapshot {
  indicators: CrossAssetIndicators;
  liquidityRegime: LiquidityRegimeId;
  liquidityLabelJa: string;
  capitalFlow: CapitalFlowId;
  capitalFlowLabelJa: string;
  factorRotation: FactorRotationId;
  factorRotationLabelJa: string;
  sectorLeadership: SectorTheme[];
  sectorLaggards: SectorTheme[];
  liquidityScore: number;
  flowScore: number;
  summaryJa: string;
}

export interface DynamicBetaTarget {
  maxPortfolioBeta: number;
  rationaleJa: string;
}

export interface DrawdownExposureReduction {
  drawdownPct: number;
  reductionPct: number;
  noteJa: string;
}

export interface CrisisDefensePlan {
  active: boolean;
  exposureReductionPct: number;
  dynamicBetaTarget: DynamicBetaTarget;
  drawdownReduction: DrawdownExposureReduction;
  actionsJa: string[];
}

export interface CrossAssetPortfolioGuidance {
  flow: CrossAssetFlowSnapshot;
  defense: CrisisDefensePlan;
  totalExposureReductionPct: number;
}
