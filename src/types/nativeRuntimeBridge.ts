export type TelemetryMetricSource = 'native' | 'heuristic' | 'hybrid';

export type TelemetryConfidenceField<T> = {
  value: T;
  source: TelemetryMetricSource;
  confidence: number;
  freshnessMs: number;
};

export type NativeThermalLevel =
  | 'none'
  | 'light'
  | 'moderate'
  | 'severe'
  | 'critical'
  | 'emergency'
  | 'shutdown'
  | 'unknown';

export type NativeTrimLevel =
  | 'none'
  | 'runningModerate'
  | 'runningLow'
  | 'runningCritical'
  | 'uiHidden'
  | 'background'
  | 'complete';

export type NetworkTransportQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown';

export type NativeMemoryClassSnapshot = {
  memoryClassMb: number;
  largeMemoryClassMb: number;
  lowRamDevice: boolean;
  isLowRamDevice: boolean;
};

export type NativeRuntimeSnapshot = {
  available: boolean;
  bridgeVersion: number;
  observedAt: string;
  nativeMemoryPressurePct: number;
  trimLevel: NativeTrimLevel;
  trimMemoryBurstCount: number;
  thermalStatus: NativeThermalLevel;
  batterySaverActive: boolean;
  lowPowerMode: boolean;
  foreground: boolean;
  backgroundReclaimDetected: boolean;
  droppedFramesEstimate: number;
  anrRiskScore: number;
  networkTransportQuality: NetworkTransportQuality;
  memoryClass: NativeMemoryClassSnapshot;
  manufacturer: string;
  brand: string;
  model: string;
  isXiaomiFamily: boolean;
  miuiAggressiveReclaim: boolean;
  source: TelemetryMetricSource;
  confidence: number;
  /** Android Debug.getNativeHeapAllocatedSize (MB). */
  nativeHeapAllocatedMb: number;
  javaHeapUsedMb: number;
  availMemMb: number;
  totalMemMb: number;
  batteryLevelPct: number | null;
  bridgePendingEstimate: number;
};

export type LifecycleTimelineEventKind =
  | 'foreground'
  | 'background'
  | 'inactive'
  | 'resume'
  | 'hydration_start'
  | 'hydration_end'
  | 'reconnect_start'
  | 'reconnect_end'
  | 'trim_memory';

export type LifecycleTimelineEvent = {
  at: string;
  kind: LifecycleTimelineEventKind;
  detailJa: string;
  native: boolean;
};

export type RuntimeKillRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'IMMINENT';

export type RuntimeKillPrediction = {
  level: RuntimeKillRiskLevel;
  score: number;
  summaryJa: string;
  confidence: number;
  measuredAt: string;
};

export type AnrRiskSnapshot = {
  eventLoopStallMs: number;
  renderFreezeMs: number;
  bridgeCongestionScore: number;
  longSyncTaskDetected: boolean;
  anrRiskScore: number;
  preventionActive: boolean;
};

export type TelemetryConfidenceMap = {
  thermal: TelemetryConfidenceField<NativeThermalLevel>;
  memoryPressure: TelemetryConfidenceField<number>;
  memoryTrend: TelemetryConfidenceField<number>;
  droppedFrames: TelemetryConfidenceField<number>;
  networkQuality: TelemetryConfidenceField<NetworkTransportQuality>;
  miuiReclaim: TelemetryConfidenceField<boolean>;
  anrRisk: TelemetryConfidenceField<number>;
};

export type NativeRuntimeDashboardExtension = {
  bridgeAvailable: boolean;
  metricSource: TelemetryMetricSource;
  nativeCoveragePct: number;
  killPrediction: RuntimeKillPrediction;
  anrRisk: AnrRiskSnapshot;
  memoryClass: NativeMemoryClassSnapshot;
  lifecycleTimeline: LifecycleTimelineEvent[];
  confidenceMap: TelemetryConfidenceMap;
  miuiReclaimEvents: number;
  soakModeActive: boolean;
  soakCsvExportReady: boolean;
};

export type LongSoakRecord = {
  at: string;
  orchestratorState: string;
  memoryMb: number;
  reconnectCount: number;
  fps: number;
  queueDepth: number;
  aiSuppressionMs: number;
  survivalActivations: number;
};
