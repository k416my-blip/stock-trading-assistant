/** EWMA 減衰（日次） */
export const EWMA_LAMBDA = 0.94;
export const EWMA_HALFLIFE_DAYS = Math.round(Math.log(0.5) / Math.log(EWMA_LAMBDA));

/** ローリング収縮ウィンドウ */
export const ROLLING_SHRINK_WINDOW = 60;
export const ROLLING_SHRINK_STEP = 20;

/** Black-Litterman */
export const BL_TAU = 0.05;
export const BL_RISK_AVERSION = 2.5;
export const BL_VIEW_CONFIDENCE_BASE = 0.6;

/** フラクショナル Kelly */
export const FRACTIONAL_KELLY = 0.35;
export const KELLY_MAX_SINGLE_WEIGHT_PCT = 18;

/** ウェイト安定性ペナルティ */
export const STABILITY_PENALTY_LAMBDA = 0.15;
export const STABILITY_BLEND_PRIOR = 0.35;

/** レジーム持続性 */
export const REGIME_PERSISTENCE_MIN_DAYS = 5;
export const REGIME_PERSISTENCE_MAX_DAYS = 45;

/** 動的不確実性スケール */
export const UNCERTAINTY_VOL_THRESHOLD = 24;
export const UNCERTAINTY_TAU_SCALE_MAX = 2.2;

/** ベイズ信頼区間（95%） */
export const BAYES_CI_Z = 1.96;
export const BOOTSTRAP_CI_SAMPLES = 80;

/** 感度分析 */
export const SENSITIVITY_RETURN_PERTURB_PCT = 10;
export const SENSITIVITY_COV_PERTURB_PCT = 15;

/** 頑健性ランキング閾値 */
export const ROBUSTNESS_RANK_PASS = 60;
