export const RUNTIME_SELF_HEALING_VERSION = '1.0.0';

export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';

/** Thermal pressure 0–100 scale from telemetry. */
export const THERMAL_DEEP_FREEZE_PCT = 75;
export const THERMAL_STAGED_RECOVERY_PCT = 55;

export const HEAP_VELOCITY_WARNING_PCT = 18;
export const HEAP_VELOCITY_CRITICAL_PCT = 35;

export const QUEUE_STAGNATION_WARNING_MS = 240;
export const QUEUE_STAGNATION_CRITICAL_MS = 480;

export const RECONNECT_LOOP_WARNING = 4;
export const RECONNECT_LOOP_CRITICAL = 8;

export const OBSERVER_ACCUMULATION_WARNING = 6;
export const OBSERVER_ACCUMULATION_CRITICAL = 12;

export const TIMER_DRIFT_WARNING_MS = 1_800;
export const TIMER_DRIFT_CRITICAL_MS = 3_200;

export const JOURNAL_COMPACT_THRESHOLD = 2_500;
export const JOURNAL_COMPACT_TARGET = 1_200;

export const SNAPSHOT_THIN_KEEP = 24;

export const MAINTENANCE_WINDOWS_MIN = [30, 60, 120, 180] as const;

export const FORBIDDEN_SELF_HEALING_ACTIONS = [
  'hidden_persistence',
  'stealth_background_recovery',
  'silent_wakelock',
  'autonomous_foreground_launch',
  'governance_bypass',
  'strategy_mutation',
] as const;

export const SELF_HEALING_COOLDOWN_MS = 45_000;
