import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';
import { observeAsyncQueue } from './RuntimeAsyncQueueTracker';
import { noteRuntimeHeartbeat } from './RuntimeHeartbeatTracker';
import { observeMemoryPressureSignal } from './RuntimeMemoryPressureTracker';
import { recordMemoryPressureSample } from '../orchestrator/memoryPressureGuardian';
import { noteRuntimeReconnect } from './RuntimeReconnectTracker';
import { observeThermalLevel } from './RuntimeThermalTracker';
import { noteAppBackground, noteAppForeground } from './miuiBatteryDiagnostics';
import {
  evaluateRuntimeStabilitySnapshot,
  setLastRuntimeStabilitySnapshot,
} from './RuntimeHealthMonitor';

/** Signal collection tick — no runtime knob mutations. */
export function observeRuntimeStabilityTick(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RuntimeStabilitySnapshot {
  observeThermalLevel(metrics.thermalState);
  observeMemoryPressureSignal(metrics.memoryTrendPct, metrics.native.memoryWarning);
  recordMemoryPressureSample(metrics);
  observeAsyncQueue(metrics.asyncQueueDepth, metrics.asyncQueueLatencyMs);
  if (metrics.websocket.reconnectAttempts > 0) {
    noteRuntimeReconnect(`ws-${metrics.websocket.reconnectAttempts}`);
  }
  if (metrics.websocket.heartbeatDelayMs > 0) {
    noteRuntimeHeartbeat(Date.now() - metrics.websocket.heartbeatDelayMs);
  }
  if (!performance.appForeground) noteAppBackground();
  else noteAppForeground();

  const snapshot = evaluateRuntimeStabilitySnapshot(metrics, performance);
  setLastRuntimeStabilitySnapshot(snapshot);
  return snapshot;
}

export { selectRuntimeStabilitySnapshot, selectRuntimeHealthScore } from './runtimeStabilitySelectors';
