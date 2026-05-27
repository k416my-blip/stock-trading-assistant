export type TelemetryEntropyFlow =
  | 'telemetry_entropy_flow'
  | 'signal_duplication'
  | 'replay_amplification'
  | 'export_payload_growth'
  | 'dashboard_saturation'
  | 'timeline_fragmentation'
  | 'telemetry_aging'
  | 'compression_failure_cascade'
  | 'signal_governance_record'
  | 'entropy_evolution';

export type SignalGovernanceSuggestionKind =
  | 'dedup'
  | 'compression'
  | 'replay_throttling'
  | 'export_aggregation';

export type SignalGovernanceSuggestion = {
  at: string;
  kind: SignalGovernanceSuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type EntropyGraphNode = { id: string; label: string; weight: number };
export type EntropyGraphEdge = { from: string; to: string; weight: number };

export type SignalDuplicationGraph = {
  nodes: EntropyGraphNode[];
  edges: EntropyGraphEdge[];
  measuredAt: string;
};

export type TelemetryEntropyTimelineEntry = {
  at: string;
  flow: TelemetryEntropyFlow;
  detailJa: string;
};

export type RuntimeTelemetryEntropyProfile = {
  signalEntropyScore: number;
  telemetryDuplicationRisk: number;
  replayAmplificationRisk: number;
  metricCascadeRisk: number;
  dashboardSaturationRisk: number;
  exportPayloadRisk: number;
  timelineFragmentationRisk: number;
  staleTelemetryRatio: number;
  orphanMetricCount: number;
  zombieReplayHookCount: number;
  unusedExportChainCount: number;
  measuredAt: string;
};

export type RuntimeTelemetryEntropyDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeTelemetryEntropyProfile;
  entropyHeatmap: { layer: string; entropy: number }[];
  signalDuplicationGraph: SignalDuplicationGraph;
  replayAmplificationTimeline: { at: string; level: number }[];
  dashboardSaturationRadar: { axis: string; value: number }[];
  exportPayloadHistogram: { bucket: string; count: number }[];
  governanceSuggestions: SignalGovernanceSuggestion[];
  timelineRecent: TelemetryEntropyTimelineEntry[];
};

export type RuntimeTelemetryEntropyObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  jsHeapMb: number;
  memoryTrendPct: number;
  sessionMinutes: number;
  asyncQueueDepth: number;
  reconnectPerMin: number;
  replayCount: number;
  telemetrySampleCount: number;
  dashboardRowCount: number;
  exportBytesEstimate: number;
  timelineEventCount: number;
  uniqueSignalKinds: number;
  duplicateSignalRatio: number;
  compressionRatio: number;
  snapshotWriteRate: number;
  observerOverheadRatio: number;
  telemetryAmplificationScore: number;
  soakReplayHooksActive: number;
};

export type RuntimeTelemetryEntropyExportBundle = {
  version: string;
  exportedAt: string;
  telemetryEntropyReport: Record<string, unknown>;
  replayAmplificationReport: Record<string, unknown>;
  signalDuplicationTopology: Record<string, unknown>;
  exportPayloadAnalysis: Record<string, unknown>;
  dashboardSaturationAnalysis: Record<string, unknown>;
  governanceSuggestions: SignalGovernanceSuggestion[];
  profile: RuntimeTelemetryEntropyProfile | null;
};
