import type { PerformanceCostRuntimeSnapshot } from './performanceCost';
import type { MobileRuntimeMetricsSnapshot } from './layerRuntimeScheduler';
import type { AsyncRuntimeMetricsSnapshot } from './asyncRuntimeCoordinator';

export type TelemetryHealthState = 'TELEMETRY_OK' | 'TELEMETRY_DEGRADED' | 'TELEMETRY_CRITICAL';

export type NativeThermalStatus =
  | 'none'
  | 'light'
  | 'moderate'
  | 'severe'
  | 'critical'
  | 'emergency'
  | 'shutdown';

export type NativeAppStateObservation =
  | 'active'
  | 'background'
  | 'inactive'
  | 'unknown'
  | 'extension';

export type NativeNetworkType = 'wifi' | 'cellular' | 'offline' | 'unknown';

export type NativeDeviceObservationSnapshot = {
  batterySaverActive: boolean;
  lowPowerMode: boolean;
  thermalStatus: NativeThermalStatus;
  memoryWarning: boolean;
  appState: NativeAppStateObservation;
  backgroundRestriction: boolean;
  networkType: NativeNetworkType;
  miuiAggressiveReclaim: boolean;
  thermalThrottlingDetected: boolean;
  resumeSpikeDetected: boolean;
  observedAt: string;
};

export type RenderPerformanceSnapshot = {
  renderFPS: number;
  frameDropRate: number;
  renderBurstRate: number;
  dashboardCommitDurationMs: number;
  reactTransitionPressurePct: number;
  renderSpikeDetected: boolean;
  subtreeHotReloadDetected: boolean;
  excessiveRerenderDetected: boolean;
};

export type WebSocketTelemetrySnapshot = {
  wsLatencyMs: number;
  reconnectAttempts: number;
  frameDelayMs: number;
  heartbeatDelayMs: number;
  offlineRecoveryDurationMs: number | null;
  jitterScore: number;
  reconnectStormDetected: boolean;
  packetBatchingEfficiencyPct: number;
};

export type HydrationResumeTelemetrySnapshot = {
  hydrationDurationMs: number | null;
  resumeRecoveryTimeMs: number | null;
  duplicateHydrationRate: number;
  postResumePressurePct: number;
  resumeCascadeRiskPct: number;
};

export type LongSessionProfilerSnapshot = {
  sessionMinutes: number;
  memoryGrowthTrendPct: number;
  asyncQueueGrowthTrend: number;
  renderDegradationPct: number;
  websocketDegradationPct: number;
  orchestrationSlowdownPct: number;
  explanationCacheGrowth: number;
  checkpoint: '30m' | '60m' | '90m' | 'under_30m';
};

export type RuntimeTelemetryMetricsSnapshot = {
  jsHeapEstimateMb: number;
  renderFPS: number;
  droppedFrames: number;
  eventLoopLatencyMs: number;
  asyncQueueLatencyMs: number;
  websocketRttMs: number;
  hydrationDurationMs: number | null;
  foregroundResumeDurationMs: number | null;
  orchestrationDurationMs: number | null;
  explanationGenerationDurationMs: number | null;
  asyncQueueDepth: number;
  memoryTrendPct: number;
  thermalState: NativeThermalStatus;
  runtimeModeLabelJa: string;
  native: NativeDeviceObservationSnapshot;
  render: RenderPerformanceSnapshot;
  websocket: WebSocketTelemetrySnapshot;
  hydrationResume: HydrationResumeTelemetrySnapshot;
  longSession: LongSessionProfilerSnapshot;
  measuredAt: string;
};

export type AdaptiveRuntimeTuningSnapshot = {
  maxDashboardFps: number;
  dashboardCompact: boolean;
  asyncConcurrency: number;
  websocketHeartbeatMs: number;
  explanationSamplingRate: number;
  strategyChangeForbidden: true;
  governanceOverrideForbidden: true;
  appliedAt: string;
};

export type RuntimeTelemetryEvaluation = {
  state: TelemetryHealthState;
  stateLabelJa: string;
  metrics: RuntimeTelemetryMetricsSnapshot;
  tuning: AdaptiveRuntimeTuningSnapshot;
  summaryJa: string;
  compactDashboard: boolean;
  lastAnomalySummaryJa: string | null;
};

export type RuntimeTelemetryPersisted = {
  version: 1;
  lastSessionMetrics: RuntimeTelemetryMetricsSnapshot | null;
  crashRecoverySnapshot: {
    at: string;
    state: TelemetryHealthState;
    summaryJa: string;
  } | null;
  longSessionTrend: LongSessionProfilerSnapshot[];
  thermalHistory: { at: string; status: NativeThermalStatus }[];
  reconnectHistory: { at: string; attempts: number }[];
  lastSavedAt: string;
};

export type EvaluateRuntimeTelemetryInput = {
  performance: PerformanceCostRuntimeSnapshot;
  mobileMetrics: MobileRuntimeMetricsSnapshot;
  asyncMetrics: AsyncRuntimeMetricsSnapshot;
  queueSize: number;
  memoryPressure: boolean;
  thermalPressurePct: number;
  sessionMinutes: number;
  cascadePressure: number;
  refreshDurationMs?: number;
};

export type BuildRuntimeTelemetryBundleInput = {
  evaluation: RuntimeTelemetryEvaluation;
  paperTradingOnly: true;
  realTradingEnabled: false;
};

export type RuntimeTelemetryDashboardBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  strategyActionChangeForbidden: true;
  governanceOverrideForbidden: true;
  evaluation: RuntimeTelemetryEvaluation;
  startupAnomalyJa: string | null;
  orchestrator?: import('./runtimeOrchestrator').RuntimeOrchestratorSnapshot | null;
  nativeExtension?: import('./nativeRuntimeBridge').NativeRuntimeDashboardExtension | null;
};
