export const POST_SOAK_ANALYSIS_VERSION = '1.0.0';

export const POST_SOAK_SCORE_PRODUCTION_READY = 90;
export const POST_SOAK_SCORE_GUARDED_RELEASE = 80;
export const POST_SOAK_SCORE_HIGH_RISK = 70;

export const POST_SOAK_FAIL_DUPLICATE_SOCKETS = 0;
export const POST_SOAK_FAIL_OWNERSHIP_VIOLATIONS = 0;
export const POST_SOAK_FAIL_RECONNECT_STORM_PER_MIN = 4;
export const POST_SOAK_FAIL_HYDRATION_OVERLAP = 1;
export const POST_SOAK_FAIL_TIMER_DRIFT_MS = 2000;
export const POST_SOAK_FAIL_DELAYED_RESUME_MS = 3000;
export const POST_SOAK_FAIL_SILENT_DISCONNECT = 1;

export const POST_SOAK_RELEASE_TIER_LABELS = {
  production_ready: 'Production Ready (90–100)',
  guarded_release: 'Guarded Release (80–89)',
  high_operational_risk: 'High Operational Risk (70–79)',
  unstable_runtime: 'Unstable Runtime (<70)',
} as const;
