export type ResourceStabilityFlow =
  | 'resource_stability_flow'
  | 'memory_pressure'
  | 'thread_latency'
  | 'render_storm'
  | 'event_queue_saturation'
  | 'telemetry_payload_explosion'
  | 'battery_degradation'
  | 'background_observer_accumulation'
  | 'long_session_resource_drift'
  | 'resource_evolution';

export type ResourceStabilityTimelineEntry = {
  at: string;
  flow: ResourceStabilityFlow;
  detailJa: string;
};

export type RuntimeResourceStabilityProfile = {
  runtimeMemoryPressure: number;
  runtimeThreadLatencyRisk: number;
  runtimeRenderStormRisk: number;
  runtimeEventQueueRisk: number;
  runtimeTelemetryPayloadRisk: number;
  runtimeBatteryRisk: number;
  runtimeBackgroundObserverRisk: number;
  resourceStabilityScore: number;
  measuredAt: string;
};

export type RuntimeResourceStabilityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeResourceStabilityProfile;
  saturationGauge: { label: string; level: number }[];
  driftRadar: { axis: string; value: number }[];
  timelineRecent: ResourceStabilityTimelineEntry[];
};

export type RuntimeResourceStabilityObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  jsHeapMb: number;
  memoryTrendPct: number;
  sessionMinutes: number;
  bridgeTrafficRate: number;
  renderStormRisk: number;
  reconnectPerMin: number;
  hydrationOverlapCount: number;
  batterySaver: boolean;
  appForeground: boolean;
  screenOff: boolean;
  observerOverheadRatio: number;
  telemetryAmplificationScore: number;
  thermalState: string;
};

export type RuntimeResourceStabilityExportBundle = {
  version: string;
  exportedAt: string;
  resourceStabilityReport: Record<string, unknown>;
  memoryPressureReport: Record<string, unknown>;
  threadLatencyReport: Record<string, unknown>;
  renderStormReport: Record<string, unknown>;
  telemetryPayloadReport: Record<string, unknown>;
  batteryRiskReport: Record<string, unknown>;
  resourceDriftReport: Record<string, unknown>;
  profile: RuntimeResourceStabilityProfile | null;
};
