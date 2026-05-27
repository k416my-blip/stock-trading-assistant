export type AdaptiveObservationFlow =
  | 'observation_load'
  | 'adaptive_routing'
  | 'telemetry_saturation'
  | 'semantic_load_shedding'
  | 'observer_suggestion';

export type AdaptiveObservationSuggestionKind =
  | 'observation_routing'
  | 'semantic_attention'
  | 'dashboard_overload'
  | 'recursive_telemetry'
  | 'observer_focus'
  | 'semantic_congestion'
  | 'metric_density'
  | 'observation_topology';

export type AdaptiveObservationSuggestion = {
  at: string;
  kind: AdaptiveObservationSuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type AdaptiveObservationGraphNode = { id: string; label: string; pressure: number };
export type AdaptiveObservationGraphEdge = { from: string; to: string; congestion: number };

export type AdaptiveObservationGraph = {
  nodes: AdaptiveObservationGraphNode[];
  edges: AdaptiveObservationGraphEdge[];
  measuredAt: string;
};

export type RuntimeAdaptiveObservationTimelineEntry = {
  at: string;
  flow: AdaptiveObservationFlow;
  detailJa: string;
};

export type RuntimeAdaptiveObservationProfile = {
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
  measuredAt: string;
};

export type RuntimeAdaptiveObservationDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeAdaptiveObservationProfile;
  observationPressureHeatmap: { layer: string; pressure: number }[];
  semanticHotPathGraph: AdaptiveObservationGraph;
  observerAttentionRadar: { axis: string; value: number }[];
  telemetryCongestionTimeline: { at: string; congestion: number }[];
  recursiveSignalTopology: AdaptiveObservationGraph;
  dashboardOverloadMonitor: { label: string; value: number }[];
  semanticRoutingMap: AdaptiveObservationGraph;
  observationQueueVisualization: { queue: string; depth: number }[];
  suggestions: AdaptiveObservationSuggestion[];
  timelineRecent: RuntimeAdaptiveObservationTimelineEntry[];
};

export type RuntimeAdaptiveObservationObserveInput = {
  semanticPhaseVolatility: number;
  semanticStateTransitionVelocity: number;
  meaningPhaseInstability: number;
  ontologyStateShiftRisk: number;
  semanticCrystallizationPressure: number;
  semanticFluidityIndex: number;
  ontologyRigidityGradient: number;
  observerStateSynchronizationRisk: number;
  observerPhaseLockRisk: number;
  semanticStateCollapseRisk: number;
  semanticFlowTurbulence: number;
  semanticCirculationStress: number;
  recursiveMeaningCurrent: number;
  semanticPressureFlow: number;
  observerInterpretationConvection: number;
  worldviewDiffusionInstability: number;
  ontologyCollectiveDrift: number;
  semanticStatePersistence: number;
  recursiveOntologyElasticity: number;
  dashboardHeatRetention: number;
  recursiveEnergyFeedback: number;
  replayHeatAmplification: number;
  semanticNoiseDominance: number;
  ontologyFlowFragmentation: number;
  observerThermalFatigue: number;
  cognitiveHeatOverload: number;
  metricThermalEquilibriumFailure: number;
  observerDependencyLoopRisk: number;
  topologyCollapseRisk: number;
  compressionRatio: number;
  boundednessConfidence: number;
  metricContainmentRatio: number;
  dashboardSemanticCrowding: number;
  operatorSemanticFatigue: number;
  replayAmplificationRisk: number;
  observerChainDepth: number;
  dashboardAttentionStressBase: number;
  runtimeSignalJitterBase: number;
  recursiveTelemetryDensityBase: number;
  semanticMonitoringFatigueBase: number;
  semanticHotPathIntensityBase: number;
  semanticQueueFragmentationBase: number;
  semanticPriorityCollapseBase: number;
};

export type RuntimeAdaptiveObservationExportBundle = {
  version: string;
  exportedAt: string;
  observationLoadAnalysis: Record<string, unknown>;
  adaptiveRoutingReport: Record<string, unknown>;
  telemetryCongestionAnalysis: Record<string, unknown>;
  semanticOverloadReport: Record<string, unknown>;
  observerFatigueAnalysis: Record<string, unknown>;
  recursiveMonitoringTopology: Record<string, unknown>;
  suggestions: AdaptiveObservationSuggestion[];
  profile: RuntimeAdaptiveObservationProfile | null;
};
