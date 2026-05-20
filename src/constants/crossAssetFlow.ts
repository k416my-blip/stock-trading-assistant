import type {
  CapitalFlowId,
  FactorRotationId,
  LiquidityRegimeId,
} from '../types/crossAssetFlow';
import type { SectorTheme } from '../types/marketRegime';
import { SECTOR_THEME_LABEL } from './marketRegime';

export const CROSS_ASSET_PROXY = {
  dxyBasket: 'SCHD',
  usRates: 'BAC',
  volIndex: 'INTC',
  bondVol: 'KO',
  highYield: '1155',
  lowVol: 'KO',
  growth: 'INTC',
  value: 'F',
  energy: '5183',
  financial: 'BAC',
} as const;

export const LIQUIDITY_REGIME_LABEL: Record<LiquidityRegimeId, string> = {
  expansion: '流動性拡大',
  neutral: '中立',
  contraction: '流動性収縮',
};

export const CAPITAL_FLOW_LABEL: Record<CapitalFlowId, string> = {
  risk_on: 'リスクオン',
  neutral: '中立',
  risk_off: 'リスクオフ',
};

export const FACTOR_ROTATION_LABEL: Record<FactorRotationId, string> = {
  value_to_growth: 'バリュー→グロース',
  growth_to_value: 'グロース→バリュー',
  defensive_rotation: 'ディフェンシブ優位',
  cyclical_rotation: 'シクリカル優位',
  stable: 'ローテーション弱',
};

export const DEFAULT_MAX_BETA_NORMAL = 1.2;
export const DEFAULT_MAX_BETA_HIGH_VOL = 1.0;
export const DEFAULT_MAX_BETA_CRISIS = 0.85;

export const DRAWDOWN_REDUCTION_TIERS: { minPct: number; reductionPct: number }[] = [
  { minPct: 15, reductionPct: 35 },
  { minPct: 10, reductionPct: 25 },
  { minPct: 5, reductionPct: 12 },
];

export function sectorLabel(sector: SectorTheme): string {
  return SECTOR_THEME_LABEL[sector];
}
