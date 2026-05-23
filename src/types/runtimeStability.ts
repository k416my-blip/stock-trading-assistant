import type { RuntimeTelemetryMetricsSnapshot } from './runtimeTelemetry';

export type StabilityAnomalyKind =
  | 'reconnect_storm'
  | 'ws_duplicate'
  | 'hydration_collision'
  | 'async_starvation'
  | 'memory_pressure'
  | 'thermal_throttle'
  | 'resume_race'
  | 'miui_battery_kill'
  | 'heartbeat_gap'
  | 'silent_ws_disconnect';

export type RuntimeStabilityMetrics = {
  reconnectPerMin: number;
  wsDuplicateCount: number;
  hydrationOverlapCount: number;
  asyncQueueLagMs: number;
  frameDelayMs: number;
  memoryWarning: boolean;
  thermalLevel: RuntimeTelemetryMetricsSnapshot['thermalState'];
  backgroundDurationMs: number;
  resumeLatencyMs: number;
  heartbeatAgeMs: number;
  queuedTaskCount: number;
  executorLagMs: number;
  unresolvedPromiseEstimate: number;
  longTaskDurationMs: number;
  timerDriftMs: number;
  observedAt: string;
};

export type RuntimeStabilityAnomaly = {
  kind: StabilityAnomalyKind;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  summaryJa: string;
};

export type RuntimeStabilitySnapshot = {
  healthScore: number;
  healthLabelJa: string;
  metrics: RuntimeStabilityMetrics;
  anomalies: RuntimeStabilityAnomaly[];
  reconnectBudgetRemaining: number;
  reconnectCooldownUntil: number;
  hydrationLockActive: boolean;
  websocketStatusJa: string;
  measuredAt: string;
};
