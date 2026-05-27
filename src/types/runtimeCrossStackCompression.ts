export type CompressionFlow =
  | 'cross_stack_compression'
  | 'telemetry_deduplication'
  | 'signal_clustering'
  | 'observer_deduplication'
  | 'replay_deduplication'
  | 'export_normalization'
  | 'stack_topology'
  | 'compression_ratio'
  | 'amplification_heatmap'
  | 'compression_evolution';

export type CompressionTimelineEntry = {
  at: string;
  flow: CompressionFlow;
  detailJa: string;
};

export type RuntimeCrossStackCompressionProfile = {
  signalCompressionRatio: number;
  telemetryDedupRatio: number;
  observerDedupRatio: number;
  replayDedupRatio: number;
  stackSignalCount: number;
  clusteredSignalCount: number;
  crossStackCompressionScore: number;
  measuredAt: string;
};

export type RuntimeCrossStackCompressionDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeCrossStackCompressionProfile;
  stackTopology: { id: string; label: string; depth: number }[];
  compressionTimeline: { at: string; ratio: number }[];
  amplificationHeatmap: { stack: string; intensity: number }[];
  timelineRecent: CompressionTimelineEntry[];
};

export type RuntimeCrossStackCompressionObserveInput = {
  sessionMinutes: number;
  stackCount: number;
  rawSignalCount: number;
  observerOverheadRatio: number;
  telemetryAmplificationScore: number;
  runtimeNarrativeIntegrityScore: number;
  runtimeMetaCognitionScore: number;
  runtimeAgencyIntegrityScore: number;
  runtimeEpistemicConfidence: number;
  runtimeCompressionEfficiency: number;
};

export type RuntimeCrossStackCompressionExportBundle = {
  version: string;
  exportedAt: string;
  compressionReport: Record<string, unknown>;
  topologyExport: Record<string, unknown>;
  deduplicationReport: Record<string, unknown>;
  heatmapExport: Record<string, unknown>;
  profile: RuntimeCrossStackCompressionProfile | null;
};
