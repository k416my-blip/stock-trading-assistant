export type MetaLimitGovernanceFlow =
  | 'recursive_boundary_flow'
  | 'observer_of_observer_chain'
  | 'monitoring_chain_expansion'
  | 'semantic_infinite_loop'
  | 'governance_meta_cascade'
  | 'topology_self_reference'
  | 'boundedness_stability'
  | 'epistemic_boundary_integrity'
  | 'observer_termination_confidence';

export type MetaLimitSuggestionKind =
  | 'recursion_boundary'
  | 'monitoring_expansion'
  | 'semantic_infinity'
  | 'observer_termination'
  | 'topology_boundary_drift';

export type MetaLimitSuggestion = {
  at: string;
  kind: MetaLimitSuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type RecursiveBoundaryNode = { id: string; label: string; depth: number };
export type RecursiveBoundaryEdge = { from: string; to: string; recursion: number };

export type RecursiveBoundaryGraph = {
  nodes: RecursiveBoundaryNode[];
  edges: RecursiveBoundaryEdge[];
  measuredAt: string;
};

export type RuntimeMetaLimitTimelineEntry = {
  at: string;
  flow: MetaLimitGovernanceFlow;
  detailJa: string;
};

export type RuntimeMetaLimitProfile = {
  metaRecursionDepth: number;
  observerOfObserverDepth: number;
  monitoringChainExpansionRisk: number;
  semanticInfiniteLoopRisk: number;
  governanceMetaCascadeRisk: number;
  topologySelfReferenceScore: number;
  recursionBoundaryStability: number;
  epistemicBoundaryIntegrity: number;
  observerTerminationConfidence: number;
  finiteObservationScore: number;
  measuredAt: string;
};

export type RuntimeMetaLimitDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeMetaLimitProfile;
  recursionBoundaryGraph: RecursiveBoundaryGraph;
  observerDepthLadder: { rung: string; depth: number }[];
  monitoringExpansionTimeline: { at: string; level: number }[];
  semanticInfinityRadar: { axis: string; value: number }[];
  topologySelfReferenceMap: RecursiveBoundaryGraph;
  boundednessStabilityGauge: { label: string; value: number }[];
  recursionBoundarySuggestions: MetaLimitSuggestion[];
  monitoringExpansionWarnings: MetaLimitSuggestion[];
  semanticInfinityAlerts: MetaLimitSuggestion[];
  observerTerminationHints: MetaLimitSuggestion[];
  topologyBoundaryDriftWarnings: MetaLimitSuggestion[];
  timelineRecent: RuntimeMetaLimitTimelineEntry[];
};

export type RuntimeMetaLimitObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  sessionMinutes: number;
  observerChainDepthEstimate: number;
  observerContextDecay: number;
  governanceLayerCount: number;
  governanceDrift: number;
  telemetryAmplificationScore: number;
  replayCount: number;
  narrativeNodeCount: number;
  narrativeDuplicationRatio: number;
  recursiveMeaningAmplification: number;
  topologyFragmentationScore: number;
  topologyCollapseRisk: number;
  cognitionTopologyComplexity: number;
  epistemicStabilityScore: number;
  duplicateSignalRatio: number;
  dashboardRowCount: number;
  monitoringLayerCount: number;
  semanticSelfReferenceScore: number;
};

export type RuntimeMetaLimitExportBundle = {
  version: string;
  exportedAt: string;
  recursiveBoundaryAnalysis: Record<string, unknown>;
  boundednessReport: Record<string, unknown>;
  topologySelfReferenceAnalysis: Record<string, unknown>;
  observerDepthReport: Record<string, unknown>;
  monitoringExpansionAnalysis: Record<string, unknown>;
  suggestions: MetaLimitSuggestion[];
  profile: RuntimeMetaLimitProfile | null;
};
