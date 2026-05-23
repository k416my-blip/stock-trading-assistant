/** Runtime stability validation — Redmi Note 13 Pro long-session tuning. */
export const STABILITY_RECONNECT_BUDGET_PER_MIN = 6;
export const STABILITY_RECONNECT_COOLDOWN_MS = 8_000;
export const STABILITY_RECONNECT_BACKOFF_BASE_MS = 2_500;
export const STABILITY_RECONNECT_BACKOFF_MAX_MS = 45_000;
export const STABILITY_RECONNECT_STORM_PER_MIN = 4;
export const STABILITY_HYDRATION_OVERLAP_MAX = 2;
export const STABILITY_ASYNC_QUEUE_LAG_MS = 280;
export const STABILITY_ASYNC_STARVATION_QUEUE = 42;
export const STABILITY_HEARTBEAT_GAP_MS = 25_000;
export const STABILITY_RESUME_RACE_MS = 1_200;
export const STABILITY_MIUI_BACKGROUND_MS = 4_000;

export const STABILITY_UI_LABELS_JA = {
  panelTitle: 'Runtime Stability（検証）',
  healthScore: 'Health Score',
  reconnectCount: 'Reconnect/min',
  hydrationState: 'Hydration Lock',
  asyncPressure: 'Async Pressure',
  thermalPressure: 'Thermal',
  websocketStatus: 'WebSocket',
  heartbeatAge: 'Heartbeat Age',
  anomalies: 'Anomalies',
  readonlyHint: '読取専用 — ランタイム操作は行いません',
  nativeTelemetry: 'Native Telemetry',
} as const;
