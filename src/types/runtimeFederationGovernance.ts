export type FederationGovernanceFlow =
  | 'federation_governance_flow'
  | 'cross_layer_causal_trace'
  | 'metric_redundancy_analysis'
  | 'observer_dependency_topology'
  | 'telemetry_federation_graph'
  | 'dashboard_saturation_origin'
  | 'semantic_drift_propagation'
  | 'federation_integrity_record';

export type FederationSuggestionKind =
  | 'metric_cluster'
  | 'replay_chain_compression'
  | 'dashboard_simplification'
  | 'federation_grouping'
  | 'observer_dependency';

export type FederationSuggestion = {
  at: string;
  kind: FederationSuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type FederationGraphNode = { id: string; label: string; weight: number };
export type FederationGraphEdge = { from: string; to: string; risk: number };

export type FederationGraph = {
  nodes: FederationGraphNode[];
  edges: FederationGraphEdge[];
  measuredAt: string;
};

export type RuntimeFederationTimelineEntry = {
  at: string;
  flow: FederationGovernanceFlow;
  detailJa: string;
};

export type RuntimeFederationProfile = {
  stackFederationComplexity: number;
  crossLayerCouplingRisk: number;
  metricExplosionRisk: number;
  dashboardSaturationPressure: number;
  federationCompressionRatio: number;
  observerFederationDrift: number;
  governanceCoordinationStability: number;
  recursiveLayerOverlap: number;
  semanticMetricRedundancy: number;
  federationIntegrityScore: number;
  measuredAt: string;
};

export type RuntimeFederationDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeFederationProfile;
  crossLayerCausalGraph: FederationGraph;
  federationSaturationRadar: { axis: string; value: number }[];
  metricRedundancyHeatmap: { metric: string; redundancy: number }[];
  observerDependencyMatrix: { observer: string; dependencies: number; risk: number }[];
  stackCompressionGauge: { label: string; value: number }[];
  federationStabilityTimeline: { at: string; level: number }[];
  stackFederationMap: FederationGraph;
  governanceHierarchyLadder: { rung: string; stability: number }[];
  telemetryFederationGraph: FederationGraph;
  civilizationLayerAggregationMap: FederationGraph;
  suggestions: FederationSuggestion[];
  timelineRecent: RuntimeFederationTimelineEntry[];
};

export type RuntimeFederationObserveInput = {
  stackCount: number;
  layerCount: number;
  metricCount: number;
  duplicateMetricRatio: number;
  semanticRedundancyRatio: number;
  dashboardRowCount: number;
  telemetrySampleCount: number;
  replayChainCount: number;
  observerDependencyCount: number;
  observerDriftScore: number;
  governanceLayerCount: number;
  governanceStabilityScore: number;
  topologyComplexity: number;
  cognitionLoad: number;
  telemetryEntropy: number;
  metaRecursionDepth: number;
  finiteObservationScore: number;
  compressionRatio: number;
};

export type RuntimeFederationExportBundle = {
  version: string;
  exportedAt: string;
  federationTopologyReport: Record<string, unknown>;
  metricRedundancyAnalysis: Record<string, unknown>;
  crossLayerCausalTrace: Record<string, unknown>;
  observerDependencyReport: Record<string, unknown>;
  dashboardSaturationAnalysis: Record<string, unknown>;
  suggestions: FederationSuggestion[];
  profile: RuntimeFederationProfile | null;
};
