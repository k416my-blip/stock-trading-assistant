export type OntologyStabilizationFlow =
  | 'ontology_stability_flow'
  | 'semantic_grounding'
  | 'reality_anchor_trace'
  | 'observer_reference_chain'
  | 'narrative_reality_divergence'
  | 'ontology_recursion'
  | 'symbolic_drift'
  | 'semantic_persistence';

export type OntologyWarningKind =
  | 'ontology_drift'
  | 'anchor_erosion'
  | 'observer_generated_reality'
  | 'symbolic_closed_loop'
  | 'recursive_ontology';

export type OntologyWarning = {
  at: string;
  kind: OntologyWarningKind;
  target: string;
  warningJa: string;
  observeOnly: true;
};

export type OntologyGraphNode = { id: string; label: string; anchor: number };
export type OntologyGraphEdge = { from: string; to: string; drift: number };

export type OntologyGraph = {
  nodes: OntologyGraphNode[];
  edges: OntologyGraphEdge[];
  measuredAt: string;
};

export type RuntimeOntologyTimelineEntry = {
  at: string;
  flow: OntologyStabilizationFlow;
  detailJa: string;
};

export type RuntimeOntologyProfile = {
  runtimeRealityAnchorScore: number;
  semanticOntologyDrift: number;
  observerGeneratedRealityRisk: number;
  recursiveMeaningCollapseRisk: number;
  ontologyFragmentationIndex: number;
  narrativeRealityDistance: number;
  symbolicReferenceInstability: number;
  semanticAnchorIntegrity: number;
  ontologyCompressionStress: number;
  recursiveOntologyDepth: number;
  semanticGroundingStrength: number;
  symbolicAnchorDensity: number;
  referenceChainIntegrity: number;
  replayMeaningPersistence: number;
  semanticPersistenceHalfLife: number;
  ontologySelfGenerationRisk: number;
  observerRealityFeedbackLoop: number;
  semanticUniverseIsolationRisk: number;
  recursiveMeaningAmplification: number;
  symbolicClosedLoopRisk: number;
  measuredAt: string;
};

export type RuntimeOntologyDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeOntologyProfile;
  ontologyStabilityRadar: { axis: string; value: number }[];
  semanticGroundingHeatmap: { layer: string; grounding: number }[];
  realityAnchorGraph: OntologyGraph;
  observerReferenceTopology: OntologyGraph;
  recursiveMeaningLadder: { rung: string; depth: number }[];
  symbolicDriftTimeline: { at: string; level: number }[];
  realityAnchorMap: OntologyGraph;
  semanticGroundingGraph: OntologyGraph;
  narrativeRealityDivergenceGraph: OntologyGraph;
  ontologyWarnings: OntologyWarning[];
  timelineRecent: RuntimeOntologyTimelineEntry[];
};

export type RuntimeOntologyObserveInput = {
  topologyComplexity: number;
  cognitionLoad: number;
  semanticDivergence: number;
  narrativeContinuity: number;
  realityAnchorConfidence: number;
  epistemicStabilityScore: number;
  governanceDrift: number;
  observerContextDecay: number;
  recursiveMeaningAmplification: number;
  topologyCollapseRisk: number;
  finiteObservationScore: number;
  federationIntegrityScore: number;
  semanticMetricRedundancy: number;
  compressionRatio: number;
  duplicateSignalRatio: number;
  replayCount: number;
  narrativeNodeCount: number;
  symbolicReferenceCount: number;
  groundedReferenceCount: number;
  observerReferenceDepth: number;
  semanticSelfReferenceScore: number;
};

export type RuntimeOntologyExportBundle = {
  version: string;
  exportedAt: string;
  ontologyStabilityReport: Record<string, unknown>;
  semanticGroundingAnalysis: Record<string, unknown>;
  realityAnchorTopology: Record<string, unknown>;
  observerReferenceReport: Record<string, unknown>;
  symbolicDriftAnalysis: Record<string, unknown>;
  warnings: OntologyWarning[];
  profile: RuntimeOntologyProfile | null;
};
