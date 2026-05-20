import type { CorrelationRegimeId } from '../types/crisisCorrelation';

export const CORRELATION_REGIME_LABEL: Record<CorrelationRegimeId, string> = {
  normal_market: '通常市場',
  high_volatility: '高ボラティリティ',
  crisis: '危機相関',
};

/** 下方相関のブレンド重み（%） */
export const DOWNSIDE_CORRELATION_WEIGHT_PCT = 40;

/** レジーム別・異セクター相関ブースト */
export const CROSS_SECTOR_CORRELATION_BOOST: Record<CorrelationRegimeId, number> = {
  normal_market: 0,
  high_volatility: 0.12,
  crisis: 0.22,
};

export const SAME_SECTOR_CORRELATION_BOOST: Record<CorrelationRegimeId, number> = {
  normal_market: 0,
  high_volatility: 0.06,
  crisis: 0.12,
};

/** ストレス調整後の相関警告閾値 */
export const STRESS_CORRELATION_THRESHOLD: Record<CorrelationRegimeId, number> = {
  normal_market: 0.65,
  high_volatility: 0.58,
  crisis: 0.52,
};

export const BETA_CLUSTER_WATCH_WEIGHT_PCT = 25;
export const BETA_CLUSTER_HIGH_WEIGHT_PCT = 40;
export const BETA_CLUSTER_CRITICAL_WEIGHT_PCT = 55;

export const BETA_CLUSTER_TOLERANCE = 0.18;
