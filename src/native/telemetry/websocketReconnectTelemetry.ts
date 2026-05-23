import type { WebSocketReconnectTelemetrySnapshot } from '../../types/nativeDeviceTelemetry';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

export function observeWebSocketReconnect(
  metrics: RuntimeTelemetryMetricsSnapshot,
): WebSocketReconnectTelemetrySnapshot {
  return {
    reconnectCount: metrics.websocket.reconnectAttempts,
    reconnectStormDetected: metrics.websocket.reconnectStormDetected,
    wsLatencyMs: metrics.websocketRttMs,
    offlineRecoveryMs: metrics.websocket.offlineRecoveryDurationMs,
  };
}
