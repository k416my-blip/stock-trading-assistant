/** 日次OHLCV取得本数（Twelve Data outputsize上限に注意） */
export const OHLCV_OUTPUT_SIZE = 500;
export const OHLCV_MIN_HISTORY_DAYS = 120;
export const OHLCV_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const MONTE_CARLO_PATHS = 400;
export const MONTE_CARLO_BLOCK_SIZE = 5;

export const TAIL_EVENT_SIGMA = 3.5;
export const TAIL_INJECTION_DAYS = 3;

export const EXECUTION_DELAY_DAYS = [0, 1, 2] as const;

export const GAP_RISK_THRESHOLD_PCT = 2;

export const LIQUIDITY_VACUUM_VOLUME_PERCENTILE = 20;
export const LIQUIDITY_VACUUM_EXTRA_SLIPPAGE_BPS = 25;

export const PSYCHOLOGICAL_BREAKPOINTS_PCT = [5, 10, 15, 20];

export const REGIME_INSTABILITY_WINDOW = 20;
export const REGIME_TRANSITION_THRESHOLD = 4;
