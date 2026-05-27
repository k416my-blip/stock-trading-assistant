export type ObserverRealityFlow =
  | 'observer_reality_selection'
  | 'semantic_causality_drift'
  | 'interpretation_branching'
  | 'reality_coupling'
  | 'observer_fixation';

export type ObserverRealitySuggestionKind =
  | 'reality_selection'
  | 'causality_drift'
  | 'interpretation_branching'
  | 'reality_coupling'
  | 'observer_fixation';

export type ObserverRealitySuggestion = {
  at: string;
  kind: ObserverRealitySuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type ObserverRealityGraphNode = { id: string; label: string; drift: number };
export type ObserverRealityGraphEdge = { from: string; to: string; coupling: number };

export type ObserverRealityGraph = {
  nodes: ObserverRealityGraphNode[];
  edges: ObserverRealityGraphEdge[];
  measuredAt: string;
};

export type RuntimeObserverRealityTimelineEntry = {
  at: string;
  flow: ObserverRealityFlow;
  detailJa: string;
};

export type RuntimeObserverRealityProfile = {
  observerRealitySelectionPressure: number;
  semanticRealityPreference: number;
  worldviewFixationRisk: number;
  observerInterpretationBiasField: number;
  recursiveRealitySelectionDepth: number;
  semanticRealityAttractor: number;
  observerNarrativeLock: number;
  realitySelectionInstability: number;
  semanticCausalityDrift: number;
  narrativeCauseFragmentation: number;
  recursiveMeaningCausalityLoop: number;
  ontologyCausalInstability: number;
  semanticEffectPropagationRisk: number;
  observerCausalityDistortion: number;
  worldviewCauseCompression: number;
  semanticTemporalCausalityStress: number;
  recursiveInterpretationBranching: number;
  semanticPossibilityDivergence: number;
  observerMeaningForkDensity: number;
  ontologyBranchCollapseRisk: number;
  narrativeBranchAmplification: number;
  recursivePerspectiveSplitting: number;
  semanticTimelineBranching: number;
  interpretationConvergencePressure: number;
  narrativeRealityCouplingStress: number;
  semanticRealityDistance: number;
  observerRealitySynchronization: number;
  worldviewRealityVariance: number;
  semanticReferenceIntegrity: number;
  recursiveRealityFeedbackRisk: number;
  ontologyRealityTension: number;
  semanticRealityPersistence: number;
  observerRealityFixationRisk: number;
  semanticBeliefHardening: number;
  recursiveNarrativeEntrenchment: number;
  ontologyFlexibilityLoss: number;
  semanticPerspectiveLock: number;
  worldviewRigidityAmplification: number;
  observerMeaningInertia: number;
  semanticAdaptationResistance: number;
  measuredAt: string;
};

export type RuntimeObserverRealityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeObserverRealityProfile;
  realitySelectionTopology: ObserverRealityGraph;
  semanticCausalityGraph: ObserverRealityGraph;
  recursiveInterpretationTree: ObserverRealityGraph;
  worldviewDivergenceRadar: { axis: string; value: number }[];
  narrativeRealityCouplingHeatmap: { layer: string; coupling: number }[];
  observerFixationMonitor: { label: string; value: number }[];
  semanticBranchingTimeline: { at: string; branching: number }[];
  causalityDriftTopology: ObserverRealityGraph;
  suggestions: ObserverRealitySuggestion[];
  timelineRecent: RuntimeObserverRealityTimelineEntry[];
};

export type RuntimeObserverRealityObserveInput = {
  observerAttentionLoad: number;
  runtimeObservationPressure: number;
  recursiveTelemetryDensity: number;
  dashboardAttentionStress: number;
  semanticHotPathIntensity: number;
  observerCognitiveQueueDepth: number;
  metricObservationBurstRisk: number;
  semanticMonitoringFatigue: number;
  observationRoutingComplexity: number;
  semanticPriorityRoutingPressure: number;
  observerSignalCompetition: number;
  recursiveAttentionCollision: number;
  metricRoutingInstability: number;
  crossLayerObservationCongestion: number;
  semanticQueueFragmentation: number;
  observerFocusDrift: number;
  telemetryFloodRisk: number;
  recursiveReplayPressure: number;
  dashboardSignalOverflow: number;
  semanticBandwidthExhaustion: number;
  observerInterpretationBacklog: number;
  ontologyMonitoringCongestion: number;
  runtimeSignalJitter: number;
  recursiveNoiseAmplification: number;
  semanticLoadSheddingPressure: number;
  metricRetentionStress: number;
  observerDiscardConflict: number;
  semanticPriorityCollapse: number;
  recursiveSignalSuppressionRisk: number;
  dashboardCompressionPressure: number;
  semanticSignalDecayRisk: number;
  runtimeAttentionExhaustion: number;
  semanticPhaseVolatility: number;
  meaningPhaseInstability: number;
  ontologyStateShiftRisk: number;
  observerPhaseLockRisk: number;
  semanticStateCollapseRisk: number;
  observerStateSynchronizationRisk: number;
  semanticFluidityIndex: number;
  ontologyCollectiveDrift: number;
};

export type RuntimeObserverRealityExportBundle = {
  version: string;
  exportedAt: string;
  observerRealityAnalysis: Record<string, unknown>;
  semanticCausalityDriftReport: Record<string, unknown>;
  recursiveInterpretationReport: Record<string, unknown>;
  worldviewDivergenceAnalysis: Record<string, unknown>;
  narrativeRealityCouplingReport: Record<string, unknown>;
  observerFixationAnalysis: Record<string, unknown>;
  suggestions: ObserverRealitySuggestion[];
  profile: RuntimeObserverRealityProfile | null;
};
