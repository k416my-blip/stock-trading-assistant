import type { ExecutionStageId, ExitTriggerId } from '../types/institutionalRisk';

export const EXECUTION_STAGE_LABEL: Record<ExecutionStageId, string> = {
  signal: 'シグナル確認',
  probe: 'プローブ（試験）',
  scale: 'スケールイン',
  full: 'フル配分',
};

export const EXIT_TRIGGER_LABEL: Record<ExitTriggerId, string> = {
  trailing_stop: 'トレーリング・ストップ',
  volatility_stop: 'ボラティリティ・ストップ',
  regime_exit: 'レジーム・エグジット',
  thesis_break: 'テシス崩壊',
};

/** 30日ターンオーバー上限（% of portfolio） */
export const MAX_TURNOVER_PCT_30D = 80;

/** ターンオーバー警告で新規買い抑制 */
export const TURNOVER_BLOCK_BUY_PCT = 65;

export const STAGED_ENTRY_PCTS: Record<ExecutionStageId, number> = {
  signal: 0,
  probe: 25,
  scale: 35,
  full: 40,
};

export const SIGNAL_DECAY_STALE_DAYS = 14;
export const SIGNAL_DECAY_CRITICAL_SCORE = 35;

export const DEFAULT_MIN_CASH_PCT = 8;
export const DEFAULT_TARGET_CASH_PCT_CRISIS = 25;
export const DEFAULT_TARGET_CASH_PCT_NORMAL = 12;

export const MAX_GROSS_EXPOSURE_PCT = 95;

/** スプレッド・スリッページ推定（bps） */
export const SPREAD_BPS_BY_MARKET = { bursa: 15, us: 8, hk: 12 } as const;
export const SLIPPAGE_BPS_BASE = 5;
