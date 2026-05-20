import type { MarketRegimeId } from '../types/marketRegime';
import type { StrategyId } from '../types/metaCapital';

export const STRATEGY_LABEL: Record<StrategyId, string> = {
  core_equity: 'コア株式',
  adaptive_alpha: '適応アルファ',
  shadow_research: 'シャドー研究',
  bayesian_blend: 'ベイズブレンド',
  defensive_cash: '防衛キャッシュ',
};

export const REGIME_STRATEGY_PRIOR: Record<
  MarketRegimeId,
  Partial<Record<StrategyId, number>>
> = {
  risk_on: { core_equity: 1.25, adaptive_alpha: 1.2, bayesian_blend: 1.1 },
  risk_off: { defensive_cash: 1.45, bayesian_blend: 1.15, core_equity: 0.75 },
  inflation_fear: { defensive_cash: 1.3, bayesian_blend: 1.1 },
  recession_fear: { defensive_cash: 1.4, core_equity: 0.7, shadow_research: 0.9 },
  liquidity_bull: { core_equity: 1.2, adaptive_alpha: 1.15 },
  tightening_bear: { defensive_cash: 1.35, bayesian_blend: 1.1 },
  recovery_phase: { core_equity: 1.15, adaptive_alpha: 1.1, shadow_research: 1.05 },
  high_volatility: { defensive_cash: 1.35, adaptive_alpha: 0.85, core_equity: 0.9 },
};

export const MAX_STRATEGY_CONCENTRATION_PCT = 42;
export const DRAWDOWN_THROTTLE_PCT = 12;
export const THROTTLE_FACTOR_MIN = 0.45;

export const ALPHA_DECAY_SHARPE_DROP = 0.35;
export const KELLY_CAP_FRACTION = 0.22;
export const TURNOVER_PENALTY_L1 = 18;
export const LIVE_SHADOW_DIVERGENCE_PCT = 8;

export const CRISIS_REGIMES: MarketRegimeId[] = ['risk_off', 'recession_fear', 'high_volatility', 'tightening_bear'];
export const CRISIS_DEFENSIVE_BOOST_PCT = 15;
export const MIN_CASH_CRISIS_PCT = 28;
export const MIN_CASH_NORMAL_PCT = 12;

export const SNAPSHOT_MAX = 10;
export const DIVERSIFICATION_PASS = 55;
export const ALLOCATION_BLOCK_SCORE = 38;

/** 戦略間の構造的相関（軽量事前） */
export const STRATEGY_STRUCTURAL_CORR: Partial<Record<StrategyId, Partial<Record<StrategyId, number>>>> = {
  core_equity: { bayesian_blend: 0.72, adaptive_alpha: 0.55, shadow_research: 0.48 },
  adaptive_alpha: { shadow_research: 0.62, core_equity: 0.55 },
  bayesian_blend: { core_equity: 0.72, adaptive_alpha: 0.5 },
  shadow_research: { adaptive_alpha: 0.62 },
  defensive_cash: { core_equity: -0.35, adaptive_alpha: -0.2 },
};
