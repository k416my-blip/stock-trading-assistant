/**
 * Adaptive runtime tuning from telemetry — FPS, compact dashboard, concurrency, WS heartbeat, explanation sampling only.
 */
import {
  TELEMETRY_DEFAULT_EXPLANATION_SAMPLE,
  TELEMETRY_HEARTBEAT_BASE_MS,
  TELEMETRY_HEARTBEAT_MAX_MS,
  TELEMETRY_HEARTBEAT_MIN_MS,
  TELEMETRY_MIN_EXPLANATION_SAMPLE,
} from '../constants/runtimeTelemetry';
import type {
  AdaptiveRuntimeTuningSnapshot,
  RuntimeTelemetryMetricsSnapshot,
  TelemetryHealthState,
} from '../types/runtimeTelemetry';
import {
  getAsyncConcurrentLimit,
  setAsyncConcurrentLimit,
} from './asyncRuntimeCoordinator';
import {
  getDashboardMaxFps,
  setDashboardCompactMode,
  setDashboardFpsCap,
  setMetricsSamplingRate,
} from './dashboardFrameStabilizer';
import { setWebsocketHeartbeatIntervalMs, setWebsocketLightweightMode } from './websocketStabilityGuard';
import { DASHBOARD_MAX_FPS_COMPACT, DASHBOARD_MAX_FPS_STABLE } from '../constants/asyncRuntimeCoordinator';

export function resetAdaptiveRuntimeTuningForTest(): void {
  setDashboardFpsCap(null);
  setDashboardCompactMode(false);
  setMetricsSamplingRate(1);
  setAsyncConcurrentLimit(2);
  setWebsocketHeartbeatIntervalMs(TELEMETRY_HEARTBEAT_BASE_MS);
  setWebsocketLightweightMode(false);
}

export function deriveAdaptiveRuntimeTuning(
  state: TelemetryHealthState,
  metrics: RuntimeTelemetryMetricsSnapshot,
  cascadePressure: number,
): AdaptiveRuntimeTuningSnapshot {
  const compact =
    state === 'TELEMETRY_CRITICAL' ||
    metrics.native.miuiAggressiveReclaim ||
    metrics.native.thermalThrottlingDetected ||
    cascadePressure >= 62;

  let maxFps = DASHBOARD_MAX_FPS_STABLE;
  if (compact) maxFps = DASHBOARD_MAX_FPS_COMPACT;
  if (state === 'TELEMETRY_CRITICAL') maxFps = Math.min(maxFps, 8);
  else if (state === 'TELEMETRY_DEGRADED') maxFps = Math.min(maxFps, 18);
  if (metrics.render.renderFPS < 12) maxFps = Math.min(maxFps, 10);

  let concurrency = 2;
  if (state === 'TELEMETRY_OK' && metrics.asyncQueueDepth < 12) concurrency = 2;
  else if (state === 'TELEMETRY_DEGRADED') concurrency = 1;
  else if (state === 'TELEMETRY_CRITICAL') concurrency = 1;

  let heartbeat = TELEMETRY_HEARTBEAT_BASE_MS;
  if (metrics.websocket.jitterScore > 40) heartbeat = TELEMETRY_HEARTBEAT_MAX_MS;
  else if (metrics.websocket.wsLatencyMs > 200) heartbeat = Math.min(TELEMETRY_HEARTBEAT_MAX_MS, heartbeat + 8000);
  else if (state === 'TELEMETRY_OK' && metrics.websocket.wsLatencyMs < 90) {
    heartbeat = TELEMETRY_HEARTBEAT_MIN_MS;
  }

  let explanationSampling = TELEMETRY_DEFAULT_EXPLANATION_SAMPLE;
  if (compact) explanationSampling = 0.45;
  if (state === 'TELEMETRY_CRITICAL') explanationSampling = TELEMETRY_MIN_EXPLANATION_SAMPLE;

  return {
    maxDashboardFps: maxFps,
    dashboardCompact: compact,
    asyncConcurrency: concurrency,
    websocketHeartbeatMs: heartbeat,
    explanationSamplingRate: explanationSampling,
    strategyChangeForbidden: true,
    governanceOverrideForbidden: true,
    appliedAt: new Date().toISOString(),
  };
}

export function applyAdaptiveRuntimeTuning(tuning: AdaptiveRuntimeTuningSnapshot): void {
  setDashboardCompactMode(tuning.dashboardCompact);
  setDashboardFpsCap(tuning.maxDashboardFps);
  setMetricsSamplingRate(tuning.explanationSamplingRate);
  setAsyncConcurrentLimit(tuning.asyncConcurrency);
  setWebsocketHeartbeatIntervalMs(tuning.websocketHeartbeatMs);
  setWebsocketLightweightMode(tuning.dashboardCompact);
  void getDashboardMaxFps();
  void getAsyncConcurrentLimit();
}
