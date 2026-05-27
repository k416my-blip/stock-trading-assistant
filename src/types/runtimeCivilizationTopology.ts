export type CivilizationTopologyFlow =
  | 'cognition_topology_flow'
  | 'epistemic_stability'
  | 'recursive_cognition_loop'
  | 'semantic_civilization_chain'
  | 'governance_meaning_propagation'
  | 'observer_worldview_fragmentation'
  | 'epistemic_amplification_route'
  | 'narrative_reality_coupling'
  | 'topology_drift_record';

export type EpistemicTopologySuggestionKind =
  | 'unstable_belief'
  | 'recursive_narrative'
  | 'topology_drift'
  | 'governance_meaning_divergence'
  | 'observer_perspective';

export type EpistemicTopologySuggestion = {
  at: string;
  kind: EpistemicTopologySuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type CivilizationTopologyNode = { id: string; label: string; stability: number };
export type CivilizationTopologyEdge = { from: string; to: string; coupling: number };

export type CivilizationTopologyGraph = {
  nodes: CivilizationTopologyNode[];
  edges: CivilizationTopologyEdge[];
  measuredAt: string;
};

export type RuntimeCivilizationTopologyTimelineEntry = {
  at: string;
  flow: CivilizationTopologyFlow;
  detailJa: string;
};

export type RuntimeCivilizationTopologyProfile = {
  cognitionTopologyComplexity: number;
  observerChainDepth: number;
  epistemicStabilityScore: number;
  narrativeRealityCoupling: number;
  governanceBeliefDrift: number;
  semanticWorldModelVariance: number;
  recursiveMeaningTopology: number;
  observerPerspectiveFragmentation: number;
  civilizationContextInstability: number;
  topologyCollapseRisk: number;
  measuredAt: string;
};

export type RuntimeCivilizationTopologyDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeCivilizationTopologyProfile;
  cognitionTopologyGraph: CivilizationTopologyGraph;
  epistemicStabilityRadar: { axis: string; value: number }[];
  observerChainMap: CivilizationTopologyGraph;
  recursiveMeaningTopology: CivilizationTopologyGraph;
  semanticCivilizationHeatmap: { layer: string; intensity: number }[];
  governanceWorldviewLadder: { rung: string; drift: number }[];
  realityCouplingGraph: CivilizationTopologyGraph;
  unstableBeliefSuggestions: EpistemicTopologySuggestion[];
  recursiveNarrativeWarnings: EpistemicTopologySuggestion[];
  topologyDriftSuggestions: EpistemicTopologySuggestion[];
  governanceMeaningDivergence: EpistemicTopologySuggestion[];
  observerPerspectiveAlerts: EpistemicTopologySuggestion[];
  timelineRecent: RuntimeCivilizationTopologyTimelineEntry[];
};

export type RuntimeCivilizationTopologyObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  sessionMinutes: number;
  observerChainDepthEstimate: number;
  governanceLayerCount: number;
  governanceConfidence: number;
  telemetryAmplificationScore: number;
  replayCount: number;
  narrativeNodeCount: number;
  narrativeDuplicationRatio: number;
  semanticSignalCount: number;
  uniqueSignalKinds: number;
  duplicateSignalRatio: number;
  semanticDivergence: number;
  narrativeContinuity: number;
  governanceDrift: number;
  observerContextDecay: number;
  recursiveMeaningAmplification: number;
  topologyFragmentationScore: number;
  realityAnchorConfidence: number;
};

export type RuntimeCivilizationTopologyExportBundle = {
  version: string;
  exportedAt: string;
  cognitionTopologyReport: Record<string, unknown>;
  epistemicStabilityAnalysis: Record<string, unknown>;
  civilizationChainTopology: Record<string, unknown>;
  observerFragmentationAnalysis: Record<string, unknown>;
  semanticWorldModelReport: Record<string, unknown>;
  governanceWorldviewAnalysis: Record<string, unknown>;
  suggestions: EpistemicTopologySuggestion[];
  profile: RuntimeCivilizationTopologyProfile | null;
};
