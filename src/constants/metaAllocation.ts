import type { EnsembleAllocatorId, FailSafeMode } from '../types/metaAllocation';
import type { MarketRegimeId } from '../types/marketRegime';

export const ENSEMBLE_ALLOCATOR_LABEL: Record<EnsembleAllocatorId, string> = {
  black_litterman: 'Black-Litterman',
  risk_parity: 'リスクパリティ',
  cvar: 'CVaR',
  min_variance: '最小分散',
  stability_penalized: '安定性ペナルティ',
};

/** レジーム別アロケーター事前重みブースト */
export const REGIME_ALLOCATOR_PRIOR: Record<
  MarketRegimeId,
  Partial<Record<EnsembleAllocatorId, number>>
> = {
  risk_on: { risk_parity: 1.3, black_litterman: 1.2 },
  risk_off: { min_variance: 1.4, stability_penalized: 1.35, cvar: 1.2 },
  inflation_fear: { min_variance: 1.2, cvar: 1.15 },
  recession_fear: { cvar: 1.35, min_variance: 1.3, stability_penalized: 1.25 },
  liquidity_bull: { risk_parity: 1.25, black_litterman: 1.15 },
  tightening_bear: { min_variance: 1.25, stability_penalized: 1.2 },
  recovery_phase: { black_litterman: 1.2, risk_parity: 1.1 },
  high_volatility: { cvar: 1.3, min_variance: 1.35, stability_penalized: 1.3 },
};

/** 不一致スコアでフェイルセーフ発動 */
export const DISAGREEMENT_FAILSAFE_THRESHOLD = 55;
export const META_ROBUSTNESS_FAILSAFE_THRESHOLD = 45;

export const FAILSAFE_MODE: FailSafeMode = 'stability_penalized';

/** メタ頑健性合格 */
export const META_ROBUSTNESS_PASS = 58;

/** BMA 事前（一様） */
export const BMA_PRIOR_UNIFORM = 0.2;
