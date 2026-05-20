import type { ShadowExecutionConfig } from '../types/shadowTrading';

export const DEFAULT_SHADOW_CAPITAL_MYR = 50_000;

export const DEFAULT_SHADOW_EXECUTION_CONFIG: ShadowExecutionConfig = {
  slippageBpsBase: 5,
  slippageVolMultiplier: 0.15,
  partialFillMinPct: 0.35,
  maxFillDelayMs: 8000,
  stalePriceMaxAgeMs: 15 * 60 * 1000,
  maxOrderPctOfDailyVolume: 2,
  overnightGapEnabled: true,
};

/** 資本保全モード */
export const CP_DRAWDOWN_THRESHOLD_PCT = 12;
export const CP_REGIME_TRANSITION_PCT = 38;
export const CP_EXECUTION_QUALITY_MIN = 45;
export const CP_DISAGREEMENT_THRESHOLD = 52;
export const CP_LIQUIDITY_RISK_MAX = 70;

export const STALE_OHLCV_HOURS = 36;
export const QUOTE_JUMP_THRESHOLD_PCT = 8;
export const API_LATENCY_WARN_MS = 2500;

export const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000;
