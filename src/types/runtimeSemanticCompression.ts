export type SemanticCompressionFlow =
  | 'semantic_aliasing'
  | 'canonical_metric_pressure'
  | 'metric_family_topology'
  | 'dashboard_semantic_overload'
  | 'observer_dependency_deadlock'
  | 'ontology_compression'
  | 'semantic_density'
  | 'compression_suggestions';

export type SemanticCompressionSuggestionKind =
  | 'canonical_metric_candidate'
  | 'semantic_merge_suggestion'
  | 'duplicate_metric_family'
  | 'cross_layer_alias_warning'
  | 'dashboard_simplification_suggestion'
  | 'observer_decoupling_hint';

export type SemanticCompressionSuggestion = {
  at: string;
  kind: SemanticCompressionSuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type SemanticCompressionGraphNode = { id: string; label: string; density: number };
export type SemanticCompressionGraphEdge = { from: string; to: string; overlap: number };

export type SemanticCompressionGraph = {
  nodes: SemanticCompressionGraphNode[];
  edges: SemanticCompressionGraphEdge[];
  measuredAt: string;
};

export type RuntimeSemanticCompressionTimelineEntry = {
  at: string;
  flow: SemanticCompressionFlow;
  detailJa: string;
};

export type RuntimeSemanticCompressionProfile = {
  semanticAliasClusterCount: number;
  metricCanonicalizationPressure: number;
  crossLayerSemanticOverlap: number;
  duplicateMeaningDensity: number;
  canonicalMetricConfidence: number;
  semanticCompressionPotential: number;
  observerAliasRisk: number;
  semanticNamingDrift: number;
  ontologyCompressionRatio: number;
  metricVocabularyEntropy: number;
  semanticClusterIntegrity: number;
  crossLayerMeaningCollapse: number;
  metricIdentityInstability: number;
  canonicalOntologyStress: number;
  dashboardSemanticCrowding: number;
  operatorSemanticFatigue: number;
  semanticPanelRedundancy: number;
  metricInterpretationCollision: number;
  visualizationAliasRisk: number;
  observerDependencyLoopRisk: number;
  metricReferenceCycleDepth: number;
  semanticMutualReferenceRisk: number;
  recursiveMeaningDependency: number;
  canonicalizationDeadlockRisk: number;
  measuredAt: string;
};

export type RuntimeSemanticCompressionDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeSemanticCompressionProfile;
  semanticOverlapHeatmap: { layer: string; overlap: number }[];
  canonicalMetricGraph: SemanticCompressionGraph;
  metricFamilyTopology: SemanticCompressionGraph;
  semanticRedundancyRadar: { axis: string; value: number }[];
  observerDependencyGraph: SemanticCompressionGraph;
  compressionPressureTimeline: { at: string; pressure: number }[];
  suggestions: SemanticCompressionSuggestion[];
  timelineRecent: RuntimeSemanticCompressionTimelineEntry[];
};

export type RuntimeSemanticCompressionObserveInput = {
  metricCount: number;
  canonicalMetricCount: number;
  semanticClusterCount: number;
  aliasPairCount: number;
  crossLayerMetricCount: number;
  duplicateMetricRatio: number;
  semanticRedundancyRatio: number;
  semanticDivergence: number;
  namingDriftScore: number;
  dashboardRowCount: number;
  panelCount: number;
  visualizationCount: number;
  operatorInteractionLatencyMs: number;
  observerDependencyCount: number;
  observerLoopCount: number;
  metricReferenceCycleCount: number;
  observerChainDepth: number;
  recursiveMeaningScore: number;
  ontologyFragmentationIndex: number;
  ontologyCompressionStress: number;
  symbolicClosedLoopRisk: number;
  runtimeFiniteBoundaryIndex: number;
  boundednessConfidence: number;
  semanticEntropyBudget: number;
  metricContainmentRatio: number;
  compressionRatio: number;
};

export type RuntimeSemanticCompressionExportBundle = {
  version: string;
  exportedAt: string;
  semanticOverlapReport: Record<string, unknown>;
  canonicalizationAnalysis: Record<string, unknown>;
  metricRedundancyReport: Record<string, unknown>;
  observerDependencyReport: Record<string, unknown>;
  dashboardSemanticSaturationAnalysis: Record<string, unknown>;
  suggestions: SemanticCompressionSuggestion[];
  profile: RuntimeSemanticCompressionProfile | null;
};
