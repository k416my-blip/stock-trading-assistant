import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  TELEMETRY_PERSIST_LONG_SESSION_MAX,
  TELEMETRY_PERSIST_RECONNECT_MAX,
  TELEMETRY_PERSIST_THERMAL_MAX,
} from '../constants/runtimeTelemetry';
import type {
  LongSessionProfilerSnapshot,
  NativeThermalStatus,
  RuntimeTelemetryMetricsSnapshot,
  RuntimeTelemetryPersisted,
  TelemetryHealthState,
} from '../types/runtimeTelemetry';

export function defaultRuntimeTelemetryPersisted(): RuntimeTelemetryPersisted {
  return {
    version: 1,
    lastSessionMetrics: null,
    crashRecoverySnapshot: null,
    longSessionTrend: [],
    thermalHistory: [],
    reconnectHistory: [],
    lastSavedAt: new Date().toISOString(),
  };
}

export async function loadRuntimeTelemetryState(): Promise<RuntimeTelemetryPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.runtimeTelemetry);
    if (!raw) return defaultRuntimeTelemetryPersisted();
    const parsed = JSON.parse(raw) as Partial<RuntimeTelemetryPersisted>;
    return {
      version: 1,
      lastSessionMetrics: parsed.lastSessionMetrics ?? null,
      crashRecoverySnapshot: parsed.crashRecoverySnapshot ?? null,
      longSessionTrend: Array.isArray(parsed.longSessionTrend) ? parsed.longSessionTrend : [],
      thermalHistory: Array.isArray(parsed.thermalHistory) ? parsed.thermalHistory : [],
      reconnectHistory: Array.isArray(parsed.reconnectHistory) ? parsed.reconnectHistory : [],
      lastSavedAt: parsed.lastSavedAt ?? new Date().toISOString(),
    };
  } catch {
    return defaultRuntimeTelemetryPersisted();
  }
}

export async function saveRuntimeTelemetryState(state: RuntimeTelemetryPersisted): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.runtimeTelemetry,
    JSON.stringify({ ...state, lastSavedAt: new Date().toISOString() }),
  );
}

export async function persistTelemetryCycle(input: {
  metrics: RuntimeTelemetryMetricsSnapshot;
  state: TelemetryHealthState;
  summaryJa: string;
  longSession: LongSessionProfilerSnapshot;
}): Promise<RuntimeTelemetryPersisted> {
  const prev = await loadRuntimeTelemetryState();
  const thermalHistory = [
    ...prev.thermalHistory,
    { at: new Date().toISOString(), status: input.metrics.thermalState },
  ].slice(-TELEMETRY_PERSIST_THERMAL_MAX);

  const reconnectHistory = [
    ...prev.reconnectHistory,
    { at: new Date().toISOString(), attempts: input.metrics.websocket.reconnectAttempts },
  ].slice(-TELEMETRY_PERSIST_RECONNECT_MAX);

  const longSessionTrend = [...prev.longSessionTrend, input.longSession].slice(
    -TELEMETRY_PERSIST_LONG_SESSION_MAX,
  );

  const crashRecoverySnapshot =
    input.state === 'TELEMETRY_CRITICAL'
      ? { at: new Date().toISOString(), state: input.state, summaryJa: input.summaryJa }
      : prev.crashRecoverySnapshot;

  const next: RuntimeTelemetryPersisted = {
    version: 1,
    lastSessionMetrics: input.metrics,
    crashRecoverySnapshot,
    longSessionTrend,
    thermalHistory,
    reconnectHistory,
    lastSavedAt: new Date().toISOString(),
  };
  await saveRuntimeTelemetryState(next);
  return next;
}

export function formatStartupAnomalyJa(persisted: RuntimeTelemetryPersisted): string | null {
  if (persisted.crashRecoverySnapshot) {
    return `前回: ${persisted.crashRecoverySnapshot.summaryJa} (${persisted.crashRecoverySnapshot.at})`;
  }
  if (persisted.lastSessionMetrics && persisted.lastSessionMetrics.droppedFrames > 8) {
    return `前回セッション: FPS ${persisted.lastSessionMetrics.renderFPS} · queue ${persisted.lastSessionMetrics.asyncQueueDepth}`;
  }
  return null;
}
