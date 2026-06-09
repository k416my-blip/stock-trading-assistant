/** 4ETF Case4 — リアルタイム前向き検証（バックテスト追加最適化禁止） */

export const FORWARD_ETF_UNIVERSE = ['SCHD', 'VYM', 'DGRO', 'SPLG'] as const;
export type ForwardEtfSymbol = (typeof FORWARD_ETF_UNIVERSE)[number];

export const FORWARD_INITIAL_CAPITAL_USD = 10_000;
export const FORWARD_MAX_CONCURRENT = 3;
export const FORWARD_HOLD_DAYS = 25;
export const FORWARD_TAKE_PROFIT_PCT = 3;
export const FORWARD_SIGNAL_START = '2024-01-01';
export const FORWARD_REPORT_MIN_TRADES = 30;
/** マイルストーン到達時にレポート生成（監視用・ルール変更なし） */
export const FORWARD_REPORT_MILESTONES = [10, 20, 30] as const;

export const FORWARD_ADX_MIN = 25;
export const FORWARD_MACD_MIN = 0.1;
export const FORWARD_SHALLOW_ADX_MIN = 30;
export const FORWARD_SHALLOW_MACD_MIN = 0.15;

export const FORWARD_REGIME_UP_THRESH = 5;
export const FORWARD_REGIME_DOWN_THRESH = -5;
export const FORWARD_SIDEWAYS_DEEP_DIST = -5;

/** 最大DD最小化配分（確定版）— 当日採用銘柄内で正規化 */
export const FORWARD_SYMBOL_WEIGHTS: Record<ForwardEtfSymbol, number> = {
  SCHD: 0,
  VYM: 0.1,
  DGRO: 0.2,
  SPLG: 0.7,
};

export const FORWARD_PRIORITY: Record<ForwardEtfSymbol, number> = {
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SCHD: 1,
};

/** 4ETFバックテスト基準（比較用・固定） */
export const FORWARD_BACKTEST_BASELINE = {
  sharpe: 1.702,
  maxDrawdownPct: -1.58,
  profitFactor: 25.799,
  winRate: 0.934,
  totalReturnPct: 113.55,
  tradeCount: 91,
  labelJa: '4ETFバックテスト（確定ルール）',
} as const;
