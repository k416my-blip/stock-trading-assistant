import type { WebSocketTelemetrySnapshot } from '../types/runtimeTelemetry';
import { getWebsocketFrameDelayMs } from './websocketStabilityGuard';

type WsTelemetryState = {
  rttSamples: number[];
  reconnectAttempts: number;
  heartbeatDelays: number[];
  offlineStartedAt: number | null;
  lastOfflineRecoveryMs: number | null;
  frameDelays: number[];
};

const state: WsTelemetryState = {
  rttSamples: [],
  reconnectAttempts: 0,
  heartbeatDelays: [],
  offlineStartedAt: null,
  lastOfflineRecoveryMs: null,
  frameDelays: [],
};

export function resetWebsocketTelemetryForTest(): void {
  state.rttSamples = [];
  state.reconnectAttempts = 0;
  state.heartbeatDelays = [];
  state.offlineStartedAt = null;
  state.lastOfflineRecoveryMs = null;
  state.frameDelays = [];
}

export function noteWebsocketReconnectAttempt(): void {
  state.reconnectAttempts += 1;
}

export function noteWebsocketRtt(ms: number): void {
  state.rttSamples.push(ms);
  if (state.rttSamples.length > 40) state.rttSamples.shift();
}

export function noteWebsocketHeartbeatDelay(ms: number): void {
  state.heartbeatDelays.push(ms);
  if (state.heartbeatDelays.length > 20) state.heartbeatDelays.shift();
}

export function noteWebsocketOffline(): void {
  if (state.offlineStartedAt == null) {
    state.offlineStartedAt = Date.now();
  }
}

export function noteWebsocketOnline(): void {
  if (state.offlineStartedAt != null) {
    state.lastOfflineRecoveryMs = Date.now() - state.offlineStartedAt;
    state.offlineStartedAt = null;
  }
}

export function noteWebsocketFrameDelay(ms: number): void {
  state.frameDelays.push(ms);
  if (state.frameDelays.length > 30) state.frameDelays.shift();
}

function jitterScore(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, samples.length - 1);
  return Math.min(100, Math.round(Math.sqrt(variance)));
}

export function observeWebSocketTelemetry(): WebSocketTelemetrySnapshot {
  const frameDelay = getWebsocketFrameDelayMs();
  if (frameDelay > 0) noteWebsocketFrameDelay(frameDelay);

  const rtt =
    state.rttSamples.length > 0
      ? Math.round(state.rttSamples.reduce((a, b) => a + b, 0) / state.rttSamples.length)
      : Math.max(40, frameDelay || 48);

  const heartbeatDelay =
    state.heartbeatDelays.length > 0
      ? Math.round(
          state.heartbeatDelays.reduce((a, b) => a + b, 0) / state.heartbeatDelays.length,
        )
      : rtt;

  const recentReconnects = state.reconnectAttempts;
  const reconnectStorm = recentReconnects >= 4;

  const batchEfficiency = Math.max(
    20,
    100 - Math.min(80, state.frameDelays.length * 4 + (reconnectStorm ? 25 : 0)),
  );

  return {
    wsLatencyMs: rtt,
    reconnectAttempts: recentReconnects,
    frameDelayMs: frameDelay || (state.frameDelays.at(-1) ?? 0),
    heartbeatDelayMs: heartbeatDelay,
    offlineRecoveryDurationMs: state.lastOfflineRecoveryMs,
    jitterScore: jitterScore(state.rttSamples.length ? state.rttSamples : [rtt]),
    reconnectStormDetected: reconnectStorm,
    packetBatchingEfficiencyPct: batchEfficiency,
  };
}
