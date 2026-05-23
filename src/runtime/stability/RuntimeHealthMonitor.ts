import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type {
  RuntimeStabilityAnomaly,
  RuntimeStabilityMetrics,
  RuntimeStabilitySnapshot,
} from '../../types/runtimeStability';
import {
  STABILITY_ASYNC_QUEUE_LAG_MS,
  STABILITY_ASYNC_STARVATION_QUEUE,
  STABILITY_HEARTBEAT_GAP_MS,
  STABILITY_HYDRATION_OVERLAP_MAX,
  STABILITY_MIUI_BACKGROUND_MS,
  STABILITY_RECONNECT_STORM_PER_MIN,
  STABILITY_RESUME_RACE_MS,
} from '../../constants/runtimeStability';
import { getAsyncQueueMetrics, isAsyncStarvation } from './RuntimeAsyncQueueTracker';
import { getHeartbeatAgeMs } from './RuntimeHeartbeatTracker';
import { getHydrationLockState } from './hydrationLock';
import { getMiuiDiagnostics, shouldEmitMiuiBatteryKillWarning } from './miuiBatteryDiagnostics';
import { getReconnectBudgetRemaining, getReconnectCooldownUntil } from './reconnectStormGuard';
import { getReconnectPerMin, getWsDuplicateCount, isReconnectStorm } from './RuntimeReconnectTracker';
import { hasMemoryWarning } from './RuntimeMemoryPressureTracker';
import { getThermalLevel, isThermalThrottling } from './RuntimeThermalTracker';
import { getWebsocketFrameDelayMs } from '../../services/websocketStabilityGuard';

function healthLabel(score: number): string {
  if (score >= 85) return '安定';
  if (score >= 65) return '注意';
  if (score >= 40) return '劣化';
  return '危険';
}

function detectAnomalies(
  metrics: RuntimeStabilityMetrics,
  now: number,
): RuntimeStabilityAnomaly[] {
  const anomalies: RuntimeStabilityAnomaly[] = [];

  if (metrics.reconnectPerMin >= STABILITY_RECONNECT_STORM_PER_MIN) {
    anomalies.push({
      kind: 'reconnect_storm',
      severity: 'critical',
      score: 90,
      summaryJa: `reconnect storm ${metrics.reconnectPerMin}/min`,
    });
  }
  if (metrics.wsDuplicateCount > 0) {
    anomalies.push({
      kind: 'ws_duplicate',
      severity: metrics.wsDuplicateCount >= 3 ? 'high' : 'medium',
      score: 55 + metrics.wsDuplicateCount * 8,
      summaryJa: `duplicate socket ${metrics.wsDuplicateCount}`,
    });
  }
  if (metrics.hydrationOverlapCount >= STABILITY_HYDRATION_OVERLAP_MAX) {
    anomalies.push({
      kind: 'hydration_collision',
      severity: 'high',
      score: 72,
      summaryJa: `hydration overlap ${metrics.hydrationOverlapCount}`,
    });
  }
  if (
    isAsyncStarvation(STABILITY_ASYNC_STARVATION_QUEUE, STABILITY_ASYNC_QUEUE_LAG_MS)
  ) {
    anomalies.push({
      kind: 'async_starvation',
      severity: 'high',
      score: 68,
      summaryJa: `async lag ${metrics.executorLagMs}ms · queue ${metrics.queuedTaskCount}`,
    });
  }
  if (metrics.memoryWarning) {
    anomalies.push({
      kind: 'memory_pressure',
      severity: 'medium',
      score: 50,
      summaryJa: 'memory warning',
    });
  }
  if (isThermalThrottling()) {
    anomalies.push({
      kind: 'thermal_throttle',
      severity: 'high',
      score: 62,
      summaryJa: `thermal ${metrics.thermalLevel}`,
    });
  }
  if (metrics.resumeLatencyMs >= STABILITY_RESUME_RACE_MS) {
    anomalies.push({
      kind: 'resume_race',
      severity: 'medium',
      score: 48,
      summaryJa: `resume latency ${metrics.resumeLatencyMs}ms`,
    });
  }
  if (
    shouldEmitMiuiBatteryKillWarning(
      STABILITY_MIUI_BACKGROUND_MS,
      metrics.heartbeatAgeMs,
      STABILITY_HEARTBEAT_GAP_MS,
      now,
    )
  ) {
    anomalies.push({
      kind: 'miui_battery_kill',
      severity: 'critical',
      score: 88,
      summaryJa: 'MIUI battery / resume kill risk',
    });
  }
  if (metrics.heartbeatAgeMs >= STABILITY_HEARTBEAT_GAP_MS) {
    anomalies.push({
      kind: 'heartbeat_gap',
      severity: 'medium',
      score: 45,
      summaryJa: `heartbeat gap ${metrics.heartbeatAgeMs}ms`,
    });
  }
  const miui = getMiuiDiagnostics();
  if (miui.silentDisconnectCount >= 2) {
    anomalies.push({
      kind: 'silent_ws_disconnect',
      severity: 'high',
      score: 70,
      summaryJa: `silent ws disconnect x${miui.silentDisconnectCount}`,
    });
  }

  return anomalies;
}

export function buildRuntimeStabilityMetrics(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  now = Date.now(),
): RuntimeStabilityMetrics {
  const asyncM = getAsyncQueueMetrics();
  const hydration = getHydrationLockState();
  const miui = getMiuiDiagnostics();
  return {
    reconnectPerMin: getReconnectPerMin(now),
    wsDuplicateCount: getWsDuplicateCount(),
    hydrationOverlapCount: hydration.overlapCount,
    asyncQueueLagMs: asyncM.executorLagMs || metrics.asyncQueueLatencyMs,
    frameDelayMs: getWebsocketFrameDelayMs(),
    memoryWarning: hasMemoryWarning() || metrics.native.memoryWarning,
    thermalLevel: getThermalLevel() || metrics.thermalState,
    backgroundDurationMs: miui.backgroundDurationMs,
    resumeLatencyMs: miui.resumeLatencyMs || (metrics.foregroundResumeDurationMs ?? 0),
    heartbeatAgeMs: getHeartbeatAgeMs(now),
    queuedTaskCount: asyncM.queuedTaskCount || metrics.asyncQueueDepth,
    executorLagMs: asyncM.executorLagMs,
    unresolvedPromiseEstimate: asyncM.unresolvedPromiseEstimate,
    longTaskDurationMs: asyncM.longTaskDurationMs,
    timerDriftMs: miui.timerDriftMs,
    observedAt: new Date(now).toISOString(),
  };
}

export function evaluateRuntimeStabilitySnapshot(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  now = Date.now(),
): RuntimeStabilitySnapshot {
  const stabilityMetrics = buildRuntimeStabilityMetrics(metrics, performance, now);
  const anomalies = detectAnomalies(stabilityMetrics, now);
  const penalty = anomalies.reduce((s, a) => s + a.score * 0.12, 0);
  const healthScore = Math.max(0, Math.round(100 - penalty));
  const storm = isReconnectStorm(STABILITY_RECONNECT_STORM_PER_MIN, now);

  return {
    healthScore,
    healthLabelJa: healthLabel(healthScore),
    metrics: stabilityMetrics,
    anomalies,
    reconnectBudgetRemaining: getReconnectBudgetRemaining(now),
    reconnectCooldownUntil: getReconnectCooldownUntil(),
    hydrationLockActive: getHydrationLockState().active,
    websocketStatusJa: storm ? 'reconnect storm' : stabilityMetrics.heartbeatAgeMs > 10_000 ? 'stale' : 'ok',
    measuredAt: new Date(now).toISOString(),
  };
}

let lastSnapshot: RuntimeStabilitySnapshot | null = null;

export function getLastRuntimeStabilitySnapshot(): RuntimeStabilitySnapshot | null {
  return lastSnapshot;
}

export function setLastRuntimeStabilitySnapshot(snapshot: RuntimeStabilitySnapshot): void {
  lastSnapshot = snapshot;
}

export function resetRuntimeHealthMonitorForTest(): void {
  lastSnapshot = null;
}
