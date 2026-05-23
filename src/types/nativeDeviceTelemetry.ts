import type { NativeThermalStatus } from './runtimeTelemetry';
import type { TelemetryMetricSource } from './nativeRuntimeBridge';

export type NativeTelemetrySamplingMode = 'full' | 'minimal' | 'paused';

export type JsThreadStallSnapshot = {
  stallMs: number;
  eventLoopLagMs: number;
  longSyncDetected: boolean;
};

export type HermesGcMetricsSnapshot = {
  gcEventsPerSec: number;
  heapDropMbLastSample: number;
  source: TelemetryMetricSource;
};

export type NativeHeapSamplerSnapshot = {
  nativeHeapMb: number;
  javaHeapUsedMb: number;
  availMemMb: number;
  totalMemMb: number;
  memoryPressurePct: number;
};

export type FrameDropSnapshot = {
  droppedFramesTotal: number;
  frameDropRate: number;
  nativeDroppedEstimate: number;
};

export type RenderStormSnapshot = {
  renderCountPerSec: number;
  renderBurstRate: number;
  renderStormDetected: boolean;
  excessiveRerenderDetected: boolean;
};

export type BridgeCongestionSnapshot = {
  bridgeQueuePressure: number;
  lastBridgeFetchMs: number;
  congestionScore: number;
};

export type WebSocketReconnectTelemetrySnapshot = {
  reconnectCount: number;
  reconnectStormDetected: boolean;
  wsLatencyMs: number;
  offlineRecoveryMs: number | null;
};

export type BatteryDrainSnapshot = {
  batteryLevelPct: number | null;
  batterySaverActive: boolean;
  deltaPerHourPct: number;
};

export type ThermalStateTrackerSnapshot = {
  thermalStatus: NativeThermalStatus;
  severeDurationSec: number;
  throttlingDetected: boolean;
};

export type BackgroundKillSnapshot = {
  trimBurstCount: number;
  lowMemoryWarning: boolean;
  miuiReclaim: boolean;
  killRiskScore: number;
};

export type AppResumeRecoverySnapshot = {
  resumeRecoveryMs: number | null;
  foregroundOscillationCount: number;
  postResumePressurePct: number;
};

export type AsyncQueueProfilerSnapshot = {
  depth: number;
  latencyMs: number;
  saturationPct: number;
};

export type DashboardRenderProfilerSnapshot = {
  dashboardCommitMs: number;
  fps: number;
  samplingThrottled: boolean;
};

export type ReplayGrowthTelemetrySnapshot = {
  replayCount: number;
  growthPerMin: number;
};

export type HeapLeakTrendSnapshot = {
  trendPct: number;
  leakSuspected: boolean;
  samples: number;
};

export type TickDurationHistogramSnapshot = {
  averageMs: number;
  maxMs: number;
  p95Ms: number;
  sampleCount: number;
};

export type RuntimeFpsSnapshot = {
  fps: number;
  droppedFrames: number;
  stable: boolean;
};

export type MemorySnapshotExportRecord = {
  at: string;
  jsHeapMb: number;
  nativeHeapMb: number;
  replayCount: number;
  asyncQueueDepth: number;
  thermalStatus: NativeThermalStatus;
};

export type NativeDeviceTelemetrySnapshot = {
  version: string;
  observedAt: string;
  deviceModel: string;
  samplingMode: NativeTelemetrySamplingMode;
  samplingIntervalMs: number;
  jsHeapMb: number;
  nativeHeapMb: number;
  hermesGcPerSec: number;
  jsThreadStallMs: number;
  droppedFrames: number;
  averageTickMs: number;
  maxTickMs: number;
  replayGrowthPerMin: number;
  renderCountPerSec: number;
  websocketReconnectCount: number;
  asyncQueueDepth: number;
  batteryDeltaPerHourPct: number;
  thermalStateDurationSec: number;
  bridgeQueuePressure: number;
  jsThreadStall: JsThreadStallSnapshot;
  hermesGc: HermesGcMetricsSnapshot;
  nativeHeap: NativeHeapSamplerSnapshot;
  frameDrop: FrameDropSnapshot;
  renderStorm: RenderStormSnapshot;
  bridgeCongestion: BridgeCongestionSnapshot;
  websocketReconnect: WebSocketReconnectTelemetrySnapshot;
  batteryDrain: BatteryDrainSnapshot;
  thermalState: ThermalStateTrackerSnapshot;
  backgroundKill: BackgroundKillSnapshot;
  appResumeRecovery: AppResumeRecoverySnapshot;
  asyncQueue: AsyncQueueProfilerSnapshot;
  dashboardRender: DashboardRenderProfilerSnapshot;
  replayGrowth: ReplayGrowthTelemetrySnapshot;
  heapLeakTrend: HeapLeakTrendSnapshot;
  tickDuration: TickDurationHistogramSnapshot;
  runtimeFps: RuntimeFpsSnapshot;
  memorySnapshots: MemorySnapshotExportRecord[];
  readonlyObservationOnly: true;
};

export type NativeDeviceTelemetryExport = {
  version: string;
  exportedAt: string;
  deviceModel: string;
  snapshot: NativeDeviceTelemetrySnapshot;
  memorySnapshots: MemorySnapshotExportRecord[];
  optimizedBundle?: import('./telemetryOverhead').CompressedTelemetryBundle;
};

export type NativeDeviceTelemetryDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  snapshot: NativeDeviceTelemetrySnapshot;
  compact: boolean;
};

export type ObserveNativeDeviceTelemetryInput = {
  metrics: import('./runtimeTelemetry').RuntimeTelemetryMetricsSnapshot;
  performance: import('./performanceCost').PerformanceCostRuntimeSnapshot;
  sessionMinutes: number;
  tickDurationMs?: number | null;
};
