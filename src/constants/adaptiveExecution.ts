import type { MarketRegimeId } from '../types/marketRegime';

/** 目標ボラティリティ（年率%） */
export const VOL_TARGET_PCT = 12;

/** Kelly上限（フラクショナル） */
export const KELLY_CAP_FRACTION = 0.25;

/** オンライン学習 EWMA */
export const LEARNING_ALPHA = 0.12;
export const LEARNING_MIN_SAMPLES = 3;

/** 執行タイミング */
export const TIMING_IMMEDIATE_THRESHOLD = 72;
export const TIMING_DEFER_THRESHOLD = 38;

/** 流動性スライス */
export const MAX_SLICE_COUNT = 6;
export const MIN_SLICE_COUNT = 1;
export const DEFAULT_ADV_PARTICIPATION_PCT = 2.5;
export const SLICE_INTERVAL_MS = 45_000;

/** レジーム遷移（簡易マルコフ事前） */
export const REGIME_TRANSITION_PRIOR: Partial<
  Record<MarketRegimeId, Partial<Record<MarketRegimeId, number>>>
> = {
  risk_on: { risk_on: 0.55, high_volatility: 0.2, risk_off: 0.15, recovery_phase: 0.1 },
  risk_off: { risk_off: 0.5, recession_fear: 0.25, recovery_phase: 0.15, risk_on: 0.1 },
  high_volatility: { high_volatility: 0.45, risk_off: 0.3, risk_on: 0.15, tightening_bear: 0.1 },
  inflation_fear: { inflation_fear: 0.4, tightening_bear: 0.3, risk_off: 0.2, risk_on: 0.1 },
  recession_fear: { recession_fear: 0.45, risk_off: 0.35, recovery_phase: 0.15, risk_on: 0.05 },
  liquidity_bull: { liquidity_bull: 0.5, risk_on: 0.3, high_volatility: 0.15, risk_off: 0.05 },
  tightening_bear: { tightening_bear: 0.45, risk_off: 0.3, inflation_fear: 0.15, recession_fear: 0.1 },
  recovery_phase: { recovery_phase: 0.4, risk_on: 0.35, risk_off: 0.15, high_volatility: 0.1 },
};

export const ALPHA_DECAY_HALF_LIFE_BASE_DAYS = 14;
export const SIGNAL_QUALITY_TRADE_MIN = 42;

import type { AdaptiveLearningState } from '../types/adaptiveExecution';

export const ADAPTIVE_LEARNING_DEFAULT: AdaptiveLearningState = {
  version: 1,
  updatedAt: '',
  ewmaSlippageBps: 18,
  ewmaFillRate: 0.88,
  ewmaImplementationShortfallBps: 22,
  ewmaSignalHitRate: 0.52,
  fillSampleCount: 0,
  shadowReturnEwmaPct: 0,
  regimeTransitionMatrix: {},
  reinforcementWeights: { timing: 1, sliceAggression: 1, volTarget: 1 },
};
