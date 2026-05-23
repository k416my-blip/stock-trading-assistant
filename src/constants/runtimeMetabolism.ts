export const RUNTIME_METABOLISM_VERSION = '1.0.0';
export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';

/** Half-life in ms */
export const HALF_LIFE_EDGE_MS = 7 * 24 * 60 * 60 * 1000;
export const HALF_LIFE_REPLAY_MS = 3 * 24 * 60 * 60 * 1000;
export const HALF_LIFE_EXPLANATION_MS = 24 * 60 * 60 * 1000;
export const HALF_LIFE_GOVERNANCE_MS = 14 * 24 * 60 * 60 * 1000;

export const METABOLISM_GC_COOLDOWN_MS = 90_000;
export const LIGHT_GC_COOLDOWN_MS = 45_000;
export const MAX_AUDIT_TRAIL = 128;
export const MAX_REPLAY_CEMETERY = 200;
export const MAX_TOMBSTONES = 500;

export const STALE_EDGE_HIT_MAX = 2;
export const STALE_EDGE_WEIGHT_MAX = 0.22;
export const FOSSIL_ROLLBACK_COUNT = 8;
export const SELF_HEALING_ADDICTION_THRESHOLD = 6;

export const SESSION_GC_MINUTES = [30, 60, 120] as const;

export const CALORIE_BUDGET_PER_TICK = 100;
