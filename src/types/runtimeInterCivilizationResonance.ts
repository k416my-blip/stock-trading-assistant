export type InterCivilizationFlow =
  | 'civilization_resonance'
  | 'ontology_collision'
  | 'civilization_divergence'
  | 'observer_interference'
  | 'plurality_stability';

export type InterCivilizationSuggestionKind =
  | 'civilization_resonance'
  | 'ontology_collision'
  | 'worldview_divergence'
  | 'observer_interference'
  | 'semantic_plurality';

export type InterCivilizationSuggestion = {
  at: string;
  kind: InterCivilizationSuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type InterCivilizationGraphNode = { id: string; label: string; resonance: number };
export type InterCivilizationGraphEdge = { from: string; to: string; collision: number };

export type InterCivilizationGraph = {
  nodes: InterCivilizationGraphNode[];
  edges: InterCivilizationGraphEdge[];
  measuredAt: string;
};

export type RuntimeInterCivilizationTimelineEntry = {
  at: string;
  flow: InterCivilizationFlow;
  detailJa: string;
};

export type RuntimeInterCivilizationProfile = {
  interCivilizationResonance: number;
  semanticResonancePressure: number;
  recursiveWorldviewCoupling: number;
  civilizationSignalOverlap: number;
  observerCollectiveSynchronization: number;
  ontologyFrequencyAlignment: number;
  semanticResonanceCascadeRisk: number;
  civilizationMeaningInterference: number;
  ontologyCollisionDensity: number;
  semanticConflictPressure: number;
  recursiveOntologyInterference: number;
  worldviewIncompatibilityIndex: number;
  narrativeCollisionStress: number;
  semanticAuthorityConflict: number;
  ontologyBoundaryInstability: number;
  causalityFrameworkCollision: number;
  civilizationDriftVelocity: number;
  semanticIsolationGradient: number;
  observerRealityFragmentation: number;
  worldviewSeparationPressure: number;
  recursiveMeaningPolarization: number;
  semanticDistanceAmplification: number;
  ontologyPartitionStress: number;
  narrativeDivergencePersistence: number;
  observerInterferenceRisk: number;
  recursivePerspectiveCollision: number;
  semanticConsensusInstability: number;
  worldviewFeedbackAmplification: number;
  observerSynchronizationCollapse: number;
  semanticSignalContention: number;
  recursiveInterpretationInterference: number;
  ontologyConsensusFatigue: number;
  semanticPluralityIntegrity: number;
  ontologyCoexistenceStability: number;
  worldviewElasticityIndex: number;
  observerPerspectiveTolerance: number;
  semanticDiversityRetention: number;
  civilizationBoundaryResilience: number;
  recursiveMeaningBalance: number;
  ontologyEquilibriumPressure: number;
  measuredAt: string;
};

export type RuntimeInterCivilizationDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeInterCivilizationProfile;
  civilizationResonanceTopology: InterCivilizationGraph;
  ontologyCollisionGraph: InterCivilizationGraph;
  worldviewDivergenceRadar: { axis: string; value: number }[];
  observerInterferenceHeatmap: { layer: string; interference: number }[];
  civilizationSynchronizationTimeline: { at: string; synchronization: number }[];
  semanticPluralityMonitor: { label: string; value: number }[];
  ontologyPartitionTopology: InterCivilizationGraph;
  recursiveResonanceCascadeGraph: InterCivilizationGraph;
  suggestions: InterCivilizationSuggestion[];
  timelineRecent: RuntimeInterCivilizationTimelineEntry[];
};

export type RuntimeInterCivilizationObserveInput = {
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
  observerSignalCompetition: number;
  semanticQueueFragmentation: number;
  crossLayerObservationCongestion: number;
  ontologyMonitoringCongestion: number;
  recursiveNoiseAmplification: number;
  semanticPriorityCollapse: number;
};

export type RuntimeInterCivilizationExportBundle = {
  version: string;
  exportedAt: string;
  civilizationResonanceReport: Record<string, unknown>;
  ontologyCollisionAnalysis: Record<string, unknown>;
  observerInterferenceReport: Record<string, unknown>;
  worldviewDivergenceAnalysis: Record<string, unknown>;
  semanticPluralityReport: Record<string, unknown>;
  civilizationSynchronizationAnalysis: Record<string, unknown>;
  suggestions: InterCivilizationSuggestion[];
  profile: RuntimeInterCivilizationProfile | null;
};
