export type TelemetryOverheadMode =
  | 'full'
  | 'low_refresh'
  | 'background_minimal'
  | 'thermal_pause'
  | 'freeze_safe'
  | 'battery_lightweight'
  | 'memory_degraded';

export type TelemetryOverheadProfile = {
  telemetryCpuCost: number;
  telemetryMemoryCost: number;
  dashboardRenderCost: number;
  snapshotWriteRate: number;
  asyncStoragePressure: number;
  exportDuration: number;
  graphRenderMs: number;
  telemetryDrift: number;
  compressionRatio: number;
  mode: TelemetryOverheadMode;
  measuredAt: string;
};

export type CompactedSnapshot = {
  at: string;
  jsHeapMb: number;
  nativeHeapMb: number;
  replayCount: number;
  asyncQueueDepth: number;
};

export type SnapshotDiff = {
  at: string;
  dJsHeapMb: number;
  dNativeHeapMb: number;
  dReplay: number;
  dAsyncDepth: number;
};

export type CompressedTimelineEntry = {
  from: string;
  to: string;
  kind: string;
  count: number;
  lastDetailJa: string;
};

export type TelemetryOverheadDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: TelemetryOverheadProfile;
  ringBufferFillPct: number;
  coalescedEventsPending: number;
  exportPaused: boolean;
  visibleDashboardRows: number;
};

export type CompressedTelemetryBundle = {
  format: 'sta-telemetry-compact-v1';
  compressionRatio: number;
  payloadBase64: string;
  originalBytes: number;
};
