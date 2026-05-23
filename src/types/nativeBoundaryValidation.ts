import type { ReconnectSource } from './reconnectEntry';
import type { TelemetryMetricSource, LifecycleTimelineEvent } from './nativeRuntimeBridge';

export type ReconnectTraceSummary = {
  at: string;
  phase: string;
  delayMs: number;
  allowed: boolean;
  source?: ReconnectSource;
  token?: string;
  detailJa: string;
};

export type NativeBoundaryEventKind =
  | 'bridge_fetch'
  | 'app_phase'
  | 'native_lifecycle'
  | 'coordinator_reconnect'
  | 'js_reconnect_execute'
  | 'hydration_overlap'
  | 'telemetry_burst'
  | 'async_saturation'
  | 'ownership_mismatch';

export type NativeBoundaryTraceEvent = {
  at: string;
  kind: NativeBoundaryEventKind;
  detailJa: string;
  native: boolean;
  durationMs?: number;
  reconnectUuid?: string;
  reconnectSource?: ReconnectSource;
  metricSource?: TelemetryMetricSource;
};

export type HistogramBucket = {
  label: string;
  count: number;
};

export type NativeBoundaryHistograms = {
  reconnectLatencyMs: HistogramBucket[];
  eventLoopLagMs: HistogramBucket[];
  memoryPressurePct: HistogramBucket[];
  thermalLevel: HistogramBucket[];
  bridgeFetchMs: HistogramBucket[];
};

export type WebsocketOwnershipRecord = {
  reconnectUuid: string;
  owner: 'js_coordinator' | 'js_execute' | 'native_untagged';
  source: ReconnectSource | 'native';
  scheduledAt: string;
  executedAt?: string;
  duplicate: boolean;
};

export type CoordinatorNativeReconnectComparison = {
  jsScheduleCount: number;
  jsExecuteCount: number;
  nativeLifecycleReconnectHints: number;
  orphanNativeReconnect: number;
  duplicateSocketCount: number;
  coalescedCount: number;
  ownershipConsistent: boolean;
};

export type NativeBoundaryValidationReport = {
  measuredAt: string;
  deviceModel: string;
  isXiaomiFamily: boolean;
  metricSource: TelemetryMetricSource;
  comparison: CoordinatorNativeReconnectComparison;
  histograms: NativeBoundaryHistograms;
  recentBoundaryTrace: NativeBoundaryTraceEvent[];
  reconnectTimeline: ReconnectTraceSummary[];
  lifecycleTimeline: LifecycleTimelineEvent[];
  websocketOwnership: WebsocketOwnershipRecord[];
  bypassDetected: boolean;
  bypassDetailJa: string;
  productionReadinessHint: string;
};
