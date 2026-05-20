/** マーケットレジーム（決定論的スコアリング・AI予測なし） */

export type MarketRegimeId =
  | 'risk_on'
  | 'risk_off'
  | 'inflation_fear'
  | 'recession_fear'
  | 'liquidity_bull'
  | 'tightening_bear'
  | 'recovery_phase'
  | 'high_volatility';

export type SectorTheme =
  | 'etf'
  | 'dividend'
  | 'financial'
  | 'technology'
  | 'energy'
  | 'consumer'
  | 'healthcare'
  | 'industrial'
  | 'utilities'
  | 'growth';

export interface MarketIndicatorsSnapshot {
  indexMomentumPct: number;
  volatilityProxyPct: number;
  oilTrendPct: number;
  usdStrengthProxy: number;
  breadthPctAboveMa50: number;
  defensiveVsGrowthSpread: number;
  ratePressureProxy: number;
  liquidityProxy: number;
  sectorRotationScore: number;
  maTrendScore: number;
  computedAt: string;
}

export interface MarketRegimeResult {
  regimeId: MarketRegimeId;
  labelJa: string;
  confidenceScore: number;
  riskScore: number;
  preferredSectors: SectorTheme[];
  avoidSectors: SectorTheme[];
  summaryJa: string;
  indicators: MarketIndicatorsSnapshot;
  regimeScores: Partial<Record<MarketRegimeId, number>>;
}
