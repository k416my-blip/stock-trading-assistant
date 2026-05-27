export type CognitiveGovernanceFlow =
  | 'cognitive_load_flow'
  | 'semantic_signal_ranking'
  | 'narrative_coherence'
  | 'governance_abstraction'
  | 'attention_fragmentation'
  | 'replay_complexity'
  | 'timeline_context_loss'
  | 'operator_latency'
  | 'cognitive_governance_record';

export type SemanticSuggestionKind =
  | 'critical_signal'
  | 'low_value_signal'
  | 'redundant_narrative'
  | 'dashboard_simplification'
  | 'replay_compression';

export type SemanticSignalSuggestion = {
  at: string;
  kind: SemanticSuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type SemanticSignalNode = { id: string; label: string; importance: number };
export type SemanticSignalEdge = { from: string; to: string; drift: number };

export type SemanticSignalTopology = {
  nodes: SemanticSignalNode[];
  edges: SemanticSignalEdge[];
  measuredAt: string;
};

export type RuntimeCognitiveGovernanceTimelineEntry = {
  at: string;
  flow: CognitiveGovernanceFlow;
  detailJa: string;
};

export type RuntimeCognitiveGovernanceProfile = {
  dashboardCognitiveLoad: number;
  semanticNoiseRatio: number;
  signalPriorityDrift: number;
  observerAttentionFragmentation: number;
  replayNarrativeComplexity: number;
  governanceAbstractionDepth: number;
  metricInterpretationDifficulty: number;
  timelineContextLossRisk: number;
  operatorDecisionLatencyRisk: number;
  narrativeContinuity: number;
  semanticDivergence: number;
  governanceDrift: number;
  observerContextDecay: number;
  recursiveMeaningAmplification: number;
  measuredAt: string;
};

export type RuntimeCognitiveGovernanceDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeCognitiveGovernanceProfile;
  cognitiveHeatmap: { layer: string; load: number }[];
  semanticDensityGraph: SemanticSignalTopology;
  attentionFragmentationRadar: { axis: string; value: number }[];
  replayComplexityTimeline: { at: string; level: number }[];
  governanceAbstractionLadder: { rung: string; depth: number }[];
  signalImportanceMap: { signal: string; importance: number }[];
  criticalSignalSuggestions: SemanticSignalSuggestion[];
  lowValueSignalSuggestions: SemanticSignalSuggestion[];
  redundantNarrativeSuggestions: SemanticSignalSuggestion[];
  dashboardSimplificationSuggestions: SemanticSignalSuggestion[];
  replayCompressionSuggestions: SemanticSignalSuggestion[];
  timelineRecent: RuntimeCognitiveGovernanceTimelineEntry[];
};

export type RuntimeCognitiveGovernanceObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  sessionMinutes: number;
  dashboardRowCount: number;
  telemetrySampleCount: number;
  replayCount: number;
  timelineEventCount: number;
  uniqueSignalKinds: number;
  duplicateSignalRatio: number;
  semanticSignalCount: number;
  criticalSignalCount: number;
  lowValueSignalCount: number;
  narrativeNodeCount: number;
  narrativeDuplicationRatio: number;
  governanceLayerCount: number;
  governanceConfidence: number;
  observerOverheadRatio: number;
  telemetryAmplificationScore: number;
  compressionRatio: number;
  contextWindowCount: number;
  operatorInteractionLatencyMs: number;
};

export type RuntimeCognitiveGovernanceExportBundle = {
  version: string;
  exportedAt: string;
  cognitiveLoadReport: Record<string, unknown>;
  semanticSignalTopology: Record<string, unknown>;
  replayNarrativeAnalysis: Record<string, unknown>;
  governanceAbstractionAnalysis: Record<string, unknown>;
  operatorAttentionRiskAnalysis: Record<string, unknown>;
  suggestions: SemanticSignalSuggestion[];
  profile: RuntimeCognitiveGovernanceProfile | null;
};
