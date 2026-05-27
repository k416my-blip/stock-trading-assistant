export type FiniteBoundaryFlow =
  | 'observation_budget'
  | 'recursion_budget'
  | 'semantic_entropy'
  | 'finite_boundary'
  | 'observer_mass'
  | 'dashboard_ceiling'
  | 'containment_stress'
  | 'stopping_analysis';

export type FiniteBoundarySuggestionKind =
  | 'observation_stopping_suggestion'
  | 'recursive_expansion_warning'
  | 'metric_freeze_candidate'
  | 'dashboard_simplification_pressure'
  | 'observer_chain_cutoff_hint';

export type FiniteBoundarySuggestion = {
  at: string;
  kind: FiniteBoundarySuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type FiniteBoundaryGraphNode = { id: string; label: string; boundedness: number };
export type FiniteBoundaryGraphEdge = { from: string; to: string; pressure: number };

export type FiniteBoundaryGraph = {
  nodes: FiniteBoundaryGraphNode[];
  edges: FiniteBoundaryGraphEdge[];
  measuredAt: string;
};

export type RuntimeFiniteBoundaryTimelineEntry = {
  at: string;
  flow: FiniteBoundaryFlow;
  detailJa: string;
};

export type RuntimeFiniteBoundaryProfile = {
  observerBudgetConsumption: number;
  semanticEntropyBudget: number;
  recursionBudgetUsage: number;
  dashboardAttentionBudget: number;
  ontologyComplexityBudget: number;
  replayAmplificationBudget: number;
  governanceExpansionBudget: number;
  symbolicDensityBudget: number;
  telemetryNoiseBudget: number;
  civilizationStackMassIndex: number;
  finiteObservationScore: number;
  boundednessConfidence: number;
  recursionTerminationProbability: number;
  observerClosureIntegrity: number;
  semanticCollapseThreshold: number;
  dashboardCognitiveCeiling: number;
  runtimeFiniteBoundaryIndex: number;
  semanticEntropyContainment: number;
  metricContainmentRatio: number;
  observerCascadeContainment: number;
  replayContainmentIntegrity: number;
  topologyContainmentStress: number;
  measuredAt: string;
};

export type RuntimeFiniteBoundaryDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeFiniteBoundaryProfile;
  observationBudgetGauge: { label: string; value: number }[];
  recursionBudgetLadder: { rung: string; usage: number }[];
  semanticEntropyRadar: { axis: string; value: number }[];
  finiteBoundaryGraph: FiniteBoundaryGraph;
  observerMassHeatmap: { layer: string; mass: number }[];
  civilizationStackPressureTimeline: { at: string; pressure: number }[];
  suggestions: FiniteBoundarySuggestion[];
  timelineRecent: RuntimeFiniteBoundaryTimelineEntry[];
};

export type RuntimeFiniteBoundaryObserveInput = {
  observerChainDepth: number;
  monitoringLayerCount: number;
  dashboardRowCount: number;
  telemetrySampleCount: number;
  metricCount: number;
  uniqueSignalKinds: number;
  duplicateSignalRatio: number;
  semanticSignalCount: number;
  semanticDivergence: number;
  semanticMetricRedundancy: number;
  replayCount: number;
  replayAmplificationRisk: number;
  governanceLayerCount: number;
  governanceDrift: number;
  topologyComplexity: number;
  topologyCollapseRisk: number;
  ontologyFragmentationIndex: number;
  recursiveOntologyDepth: number;
  symbolicReferenceCount: number;
  groundedReferenceCount: number;
  symbolicClosedLoopRisk: number;
  semanticAnchorIntegrity: number;
  runtimeRealityAnchorScore: number;
  finiteObservationScore: number;
  compressionRatio: number;
};

export type RuntimeFiniteBoundaryExportBundle = {
  version: string;
  exportedAt: string;
  observationBudgetReport: Record<string, unknown>;
  recursionBudgetAnalysis: Record<string, unknown>;
  semanticEntropyReport: Record<string, unknown>;
  finiteBoundaryAnalysis: Record<string, unknown>;
  dashboardSaturationReport: Record<string, unknown>;
  suggestions: FiniteBoundarySuggestion[];
  profile: RuntimeFiniteBoundaryProfile | null;
};
