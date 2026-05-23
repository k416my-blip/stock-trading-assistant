export const REDMI_SOAK_VALIDATION_VERSION = '1.0.0';
export const REDMI_SOAK_MIN_HOURS = 8;
export const REDMI_SOAK_TARGET_HOURS_24 = 24;
export const REDMI_SOAK_CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;
export const REDMI_SOAK_PERSIST_INTERVAL_MS = 10 * 60 * 1000;
export const REDMI_SOAK_STORAGE_KEY = '@sta/redmi_long_soak_v1';

export const REDMI_SOAK_RESUME_LATENCY_MS = 3000;
export const REDMI_SOAK_TIMER_DRIFT_MS = 2000;
export const REDMI_SOAK_RECONNECT_STORM_PER_MIN = 4;
export const REDMI_SOAK_LONG_SUSPEND_MS = 30 * 60 * 1000;

export const REDMI_SOAK_SCENARIO_LABELS: Record<string, string> = {
  background_foreground: 'Background → foreground',
  screen_off_unlock: 'Screen off → unlock',
  battery_saver_toggle: 'Battery saver ON/OFF',
  wifi_mobile_switch: 'Wi-Fi ↔ mobile',
  network_loss: 'Intermittent network loss',
  long_suspend: 'Long suspend',
  resume_spam: 'Rapid resume spam',
  ws_forced_disconnect: 'WebSocket forced disconnect',
  hydration_overlap: 'Hydration overlap',
  thermal_throttle: 'Thermal throttling',
  low_memory_trim: 'Low memory trim',
  activity_recreation: 'Activity recreation',
  swipe_away_recovery: 'Swipe-away recovery',
  overnight_idle: 'Overnight idle',
};

export const REDMI_SOAK_CRITICAL_CHECKS = [
  'native_reconnect_bypass',
  'duplicate_reconnect',
  'coordinator_ownership_violation',
  'reconnect_storm',
  'hydration_race',
  'timer_resurrection',
  'silent_websocket_disconnect',
  'miui_delayed_resume',
] as const;
