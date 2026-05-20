/** モデル安定性・自己適応制御閾値 */

export const BASE_LEARNING_RATE = 0.12;
export const MIN_GOVERNED_LEARNING_RATE = 0.02;
export const MAX_GOVERNED_LEARNING_RATE = 0.15;

export const DRIFT_L1_ALERT = 0.18;
export const DRIFT_COMPONENT_ALERT_PCT = 12;

export const STABILITY_BLOCK = 42;
export const STABILITY_WARN = 58;

export const OVERFIT_GAP_ALERT_PCT = 25;
export const OVERFIT_MIN_SAMPLES = 8;

export const REGIME_MEMORY_HALF_LIFE_DAYS = 21;
export const REGIME_STALE_DAYS = 45;

export const ENSEMBLE_DISPERSION_ALERT = 0.14;
export const FEEDBACK_AUTOCORR_ALERT = 0.55;
export const FEEDBACK_CONSECUTIVE_ALERT = 4;

export const SHADOW_LIVE_DIVERGENCE_PCT = 4.5;

export const MUTATION_CAP_PER_24H = 6;
export const MAX_WEIGHT_DELTA_PER_UPDATE = 0.025;

export const SNAPSHOT_MAX = 8;
export const WEIGHT_HISTORY_MAX = 24;

export const LONG_MEMORY_ALPHA = 0.04;
export const SHORT_MEMORY_ALPHA = 0.18;

export const FREEZE_HOURS_ON_CRITICAL = 48;
export const QUARANTINE_HOURS = 72;
