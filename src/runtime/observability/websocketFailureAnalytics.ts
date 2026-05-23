/**
 * WebSocket failure analytics.
 */
import type { WebSocketFailureAnalytics } from '../../types/runtimeObservability';
import { getRuntimeJournalEvents } from './runtimeEventJournal';

export function analyzeWebSocketFailures(
  metrics?: {
    reconnectAttempts?: number;
    heartbeatDelayMs?: number;
    silentDisconnect?: boolean;
    resumeLatencyMs?: number;
  },
): WebSocketFailureAnalytics {
  const wsEvents = getRuntimeJournalEvents({ kind: 'websocket_reconnect' });
  const gaps: number[] = [];
  let prev = 0;
  for (const e of wsEvents) {
    if (prev > 0) gaps.push(e.atMs - prev);
    prev = e.atMs;
  }
  const reconnectJitterMs =
    gaps.length === 0 ? 0 : gaps.reduce((a, b) => a + b, 0) / gaps.length;

  const stormCount = wsEvents.filter((e) => e.detailJa.includes('storm') || (e.v1 ?? 0) >= 4).length;
  const silentDisconnectCount = wsEvents.filter((e) => e.detailJa.includes('silent')).length;
  const offlineFalsePositiveCount = wsEvents.filter((e) => e.detailJa.includes('offline_fp')).length;

  const heartbeatInstabilityScore = Math.min(
    1,
    ((metrics?.heartbeatDelayMs ?? 0) / 5000) * 0.5 + (stormCount > 2 ? 0.5 : 0),
  );

  return {
    reconnectJitterMs: Math.round(reconnectJitterMs),
    stormCount,
    silentDisconnectCount: silentDisconnectCount + (metrics?.silentDisconnect ? 1 : 0),
    offlineFalsePositiveCount,
    heartbeatInstabilityScore: Math.round(heartbeatInstabilityScore * 1000) / 1000,
    resumeReconnectLatencyMs: metrics?.resumeLatencyMs ?? 0,
    events: wsEvents.slice(-50),
  };
}
