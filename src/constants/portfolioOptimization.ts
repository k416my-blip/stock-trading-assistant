/** Ledoit-Wolf 収縮の下限・上限 */
export const SHRINKAGE_MIN = 0.05;
export const SHRINKAGE_MAX = 0.85;

/** リスクパリティ反復 */
export const RISK_PARITY_MAX_ITER = 300;
export const RISK_PARITY_TOLERANCE = 1e-6;

/** CVaR 信頼水準（左尾 5%） */
export const CVAR_ALPHA = 0.05;
export const CVAR_MAX_ITER = 150;

/** Kelly 上限（単一銘柄・合計レバレッジ抑制） */
export const KELLY_MAX_FRACTION = 0.25;
export const KELLY_MAX_SINGLE_WEIGHT_PCT = 20;

/** レジーム別 株式配分スケール上限 */
export const REGIME_EQUITY_SCALE_CAP = 1.05;

/** ターンオーバー制約（L1、%ポイント） */
export const DEFAULT_MAX_REBALANCE_TURNOVER_PCT = 25;

/** ベータ・ターゲット（ロングオンリー近似） */
export const TARGET_PORTFOLIO_BETA = 1.0;

/** モンテカルロ頑健性 */
export const OPT_MC_PATHS = 300;
export const OPT_MC_HORIZON_DAYS = 63;
export const OPT_MC_BLOCK_SIZE = 5;

/** 単一銘柄ウェイト上限（最適化ボックス） */
export const DEFAULT_MAX_SINGLE_WEIGHT_PCT = 25;

/** 頑健性スコア閾値 */
export const ROBUSTNESS_SCORE_PASS = 55;
