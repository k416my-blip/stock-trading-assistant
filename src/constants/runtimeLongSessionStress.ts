export const RUNTIME_LONG_SESSION_STRESS_VERSION = '1.0.0';
export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';

/** Simulated minutes per stress tick (accelerated soak). */
export const STRESS_MINUTES_PER_TICK = 2;
export const STRESS_SNAPSHOT_EVERY_TICKS = 15;
export const STRESS_TICK_INTERVAL_MS_SIM = 1000;

export const STRESS_SESSION_TARGETS_MIN = [30, 60, 120, 180] as const;
export const STRESS_HEAP_GROWTH_WARN_MB = 40;
export const STRESS_REPLAY_GROWTH_WARN = 50;
export const STRESS_CASCADE_EMERGENCY_THRESHOLD = 0.72;
export const STRESS_ENTROPY_COLLAPSE_SIM = 0.12;
export const STRESS_ASYNC_SATURATION_DEPTH = 72;
export const STRESS_DASHBOARD_FPS_MIN = 12;
