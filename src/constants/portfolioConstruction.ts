import type { InvestmentTheme } from '../types/portfolioConstruction';
import type { SectorTheme } from '../types/marketRegime';

export const DEFAULT_MAX_PORTFOLIO_BETA = 1.2;

/** 単一セクター警告閾値（%） */
export const SECTOR_CONCENTRATION_WATCH_PCT = 20;
export const SECTOR_CONCENTRATION_HIGH_PCT = 30;
export const SECTOR_CONCENTRATION_CRITICAL_PCT = 40;

/** テーマ重複警告閾値（%） */
export const THEME_OVERLAP_WATCH_PCT = 35;
export const THEME_OVERLAP_HIGH_PCT = 50;

/** 相関が高いとみなす閾値 */
export const CORRELATION_HIGH_THRESHOLD = 0.65;
export const CORRELATION_CRITICAL_THRESHOLD = 0.8;

/** HHI（集中度指数） */
export const HHI_WATCH = 0.18;
export const HHI_HIGH = 0.25;

export const INVESTMENT_THEME_LABEL: Record<InvestmentTheme, string> = {
  income: 'インカム',
  growth: 'グロース',
  defensive: 'ディフェンシブ',
  cyclical: 'シクリカル',
  index_passive: 'インデックス',
  commodity: 'コモディティ',
};

export const SECTOR_TO_INVESTMENT_THEME: Record<SectorTheme, InvestmentTheme> = {
  etf: 'index_passive',
  dividend: 'income',
  financial: 'cyclical',
  technology: 'growth',
  energy: 'commodity',
  consumer: 'defensive',
  healthcare: 'defensive',
  industrial: 'cyclical',
  utilities: 'defensive',
  growth: 'growth',
};

export const FACTOR_LABEL: Record<string, string> = {
  value: 'バリュー',
  growth: 'グロース',
  momentum: 'モメンタム',
  quality: 'クオリティ',
  size: 'サイズ（大型）',
};
