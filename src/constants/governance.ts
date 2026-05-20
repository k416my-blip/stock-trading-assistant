import type { MarketRegimeId } from '../types/marketRegime';

/** アロケーター切替ヒステリシス */
export const HYSTERESIS_CHALLENGER_PERIODS = 3;
export const HYSTERESIS_SCORE_MARGIN = 5;
export const HYSTERESIS_EMA_ALPHA = 0.35;
export const MIN_ALLOCATOR_HOLDING_DAYS = 7;
export const MIN_REGIME_HOLDING_DAYS = 3;

/** 擬似シャープ — 長期平滑（ノイズ抑制） */
export const PSEUDO_SHARPE_WINDOW_DAYS = 126;

/** 取引停止閾値 */
export const DO_NOT_TRADE_DISAGREEMENT = 50;
export const DO_NOT_TRADE_REGIME_TRANSITION_PCT = 35;
export const DO_NOT_TRADE_REGIME_CONFIDENCE = 45;
export const DO_NOT_TRADE_LIQUIDITY_WARNINGS = 2;

/** システムヘルス */
export const HEALTH_GREEN_META_ROBUST = 58;
export const HEALTH_YELLOW_META_ROBUST = 45;

/** 監査ログ上限 */
export const AUDIT_LOG_MAX_ENTRIES = 50;

/** レジーム → 確率混合バケット */
export const REGIME_TO_MIXTURE_BUCKET: Record<
  MarketRegimeId,
  ('riskOn' | 'riskOff' | 'highVol' | 'inflation' | 'crisis' | 'transition')[]
> = {
  risk_on: ['riskOn'],
  liquidity_bull: ['riskOn'],
  recovery_phase: ['riskOn', 'transition'],
  risk_off: ['riskOff'],
  recession_fear: ['riskOff', 'crisis'],
  tightening_bear: ['riskOff', 'inflation'],
  inflation_fear: ['inflation'],
  high_volatility: ['highVol', 'crisis'],
};

export const GOVERNANCE_REASON_LABEL: Record<string, string> = {
  META_ROBUST_OK: 'メタ頑健性良好',
  META_ROBUST_LOW: 'メタ頑健性低下',
  DISAGREEMENT_HIGH: 'アロケーター不一致',
  FAILSAFE_TRIGGERED: 'フェイルセーフ発動',
  REGIME_UNCERTAIN: 'レジーム不確実',
  LIQUIDITY_RISK: '流動性リスク',
  TURNOVER_LIMIT: 'ターンオーバー上限',
  HYSTERESIS_HOLD: 'ヒステリシス保持',
  HYSTERESIS_SWITCH: 'アロケーター切替',
  DO_NOT_TRADE: '取引停止',
  ALLOCATOR_SUPPRESSED: 'アロケーター抑制',
  CONFIDENCE_LOW: '信頼度低下',
};
