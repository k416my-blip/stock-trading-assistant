import type { TelemetryHealthState } from '../types/runtimeTelemetry';

export const REAL_TRADING_ENABLED = false as const;

export const TELEMETRY_STATE_LABELS_JA: Record<TelemetryHealthState, string> = {
  TELEMETRY_OK: 'テレメトリ正常',
  TELEMETRY_DEGRADED: 'テレメトリ劣化',
  TELEMETRY_CRITICAL: 'テレメトリ危機',
};

export const TELEMETRY_UI_LABELS_JA = {
  panelTitle: 'Runtime Telemetry（実機観測）',
  safety: '観測のみ — 戦略・推論・ガバナンスは変更しません（paper / realTrading=false）',
  fps: 'FPS',
  droppedFrames: 'Dropped Frames',
  eventLoopLatency: 'Event Loop (ms)',
  wsRtt: 'WebSocket RTT (ms)',
  hydrationMs: 'Hydration (ms)',
  asyncQueueDepth: 'Async Queue',
  thermal: 'Thermal',
  memoryTrend: 'Memory Trend',
  runtimeMode: 'Runtime Mode',
  startupAnomaly: '前回セッション異常',
  compactHint: 'Redmi軽量表示',
  orchestratorState: 'Runtime State',
  transitionHistory: 'State Transitions',
  survivalActivations: 'Survival Activations',
  queuePressure: 'Queue Pressure',
  aiSuppression: 'AI Suppression',
} as const;

export const TELEMETRY_OK_FPS_MIN = 18;
export const TELEMETRY_DEGRADED_FPS_MIN = 10;
export const TELEMETRY_CRITICAL_QUEUE_DEPTH = 48;
export const TELEMETRY_DEGRADED_EVENT_LOOP_MS = 120;
export const TELEMETRY_CRITICAL_EVENT_LOOP_MS = 280;
export const TELEMETRY_WS_RTT_DEGRADED_MS = 180;
export const TELEMETRY_WS_RTT_CRITICAL_MS = 420;
export const TELEMETRY_LONG_SESSION_CHECKPOINTS_MIN = [30, 60, 90] as const;
export const TELEMETRY_PERSIST_THERMAL_MAX = 24;
export const TELEMETRY_PERSIST_RECONNECT_MAX = 32;
export const TELEMETRY_PERSIST_LONG_SESSION_MAX = 6;

export const TELEMETRY_HEARTBEAT_BASE_MS = 15_000;
export const TELEMETRY_HEARTBEAT_MIN_MS = 8_000;
export const TELEMETRY_HEARTBEAT_MAX_MS = 45_000;

export const TELEMETRY_DEFAULT_EXPLANATION_SAMPLE = 1;
export const TELEMETRY_MIN_EXPLANATION_SAMPLE = 0.2;
