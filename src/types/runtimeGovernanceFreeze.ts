export type GovernanceFreezeFlow =
  | 'expansion_governance'
  | 'maintainability'
  | 'operational_convergence'
  | 'freeze_readiness'
  | 'simplification_suggestion';

export type GovernanceFreezeSuggestionKind =
  | 'runtime_light'
  | 'lazy_loading'
  | 'verify_batching'
  | 'dashboard_compression'
  | 'telemetry_sampling'
  | 'soak_consolidation'
  | 'indexing_reduction'
  | 'scenario_deduplication';

export type GovernanceFreezeSuggestion = {
  at: string;
  kind: GovernanceFreezeSuggestionKind;
  target: string;
  suggestionJa: string;
  observeOnly: true;
};

export type GovernanceFreezeGraphNode = { id: string; label: string; pressure: number };
export type GovernanceFreezeGraphEdge = { from: string; to: string; load: number };

export type GovernanceFreezeGraph = {
  nodes: GovernanceFreezeGraphNode[];
  edges: GovernanceFreezeGraphEdge[];
  measuredAt: string;
};

export type RuntimeGovernanceFreezeTimelineEntry = {
  at: string;
  flow: GovernanceFreezeFlow;
  detailJa: string;
};

export type RuntimeGovernanceFreezeProfile = {
  runtimeExpansionEntropy: number;
  recursiveLayerProliferationRisk: number;
  stackObservabilityOverhead: number;
  semanticArchitectureDrift: number;
  runtimeComplexityAcceleration: number;
  governanceStabilizationReadiness: number;
  operationalConvergenceScore: number;
  recursiveInstrumentationPressure: number;
  stackMaintainabilityIndex: number;
  verifyExecutionStress: number;
  dashboardOperationalWeight: number;
  telemetryMaintenanceLoad: number;
  recursiveDependencyAccumulation: number;
  soakScenarioExpansionPressure: number;
  runtimeIndexingOverhead: number;
  observabilityCostGradient: number;
  architectureConvergencePressure: number;
  stabilizationNecessityIndex: number;
  semanticExpansionFatigue: number;
  observerOperationalSaturation: number;
  recursiveGovernanceStress: number;
  civilizationLayerDensity: number;
  ontologyExpansionExhaustion: number;
  runtimeOperationalFragility: number;
  expansionFreezeConfidence: number;
  runtimeStabilityThreshold: number;
  governanceLockRecommendation: number;
  operationalSteadyStateScore: number;
  recursiveGrowthTerminationPressure: number;
  stackFinalizationReadiness: number;
  observabilityEquilibriumState: number;
  architectureClosureIntegrity: number;
  measuredAt: string;
};

export type RuntimeGovernanceFreezeDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeGovernanceFreezeProfile;
  expansionEntropyGraph: GovernanceFreezeGraph;
  architectureConvergenceRadar: { axis: string; value: number }[];
  observabilityCostTimeline: { at: string; cost: number }[];
  runtimeOperationalPressureHeatmap: { layer: string; pressure: number }[];
  governanceFreezeReadinessMonitor: { label: string; value: number }[];
  recursiveExpansionTopology: GovernanceFreezeGraph;
  stabilizationEquilibriumGraph: GovernanceFreezeGraph;
  stackSaturationDashboard: { label: string; value: number }[];
  suggestions: GovernanceFreezeSuggestion[];
  timelineRecent: RuntimeGovernanceFreezeTimelineEntry[];
};

export type RuntimeGovernanceFreezeObserveInput = {
  interCivilizationResonance: number;
  semanticResonanceCascadeRisk: number;
  ontologyCollisionDensity: number;
  civilizationDriftVelocity: number;
  observerInterferenceRisk: number;
  semanticPluralityIntegrity: number;
  ontologyCoexistenceStability: number;
  worldviewElasticityIndex: number;
  civilizationBoundaryResilience: number;
  recursiveMeaningBalance: number;
  ontologyEquilibriumPressure: number;
  semanticConsensusInstability: number;
  ontologyPartitionStress: number;
  recursiveInterpretationInterference: number;
  observerSynchronizationCollapse: number;
  automatedSoakScenarioCount: number;
  runtimeStackScriptCount: number;
  dashboardLayerCount: number;
  reviewDocCount: number;
};

export type RuntimeGovernanceFreezeExportBundle = {
  version: string;
  exportedAt: string;
  governanceFreezeAnalysis: Record<string, unknown>;
  runtimeMaintainabilityReport: Record<string, unknown>;
  operationalConvergenceAnalysis: Record<string, unknown>;
  stackSaturationReport: Record<string, unknown>;
  observabilityCostReport: Record<string, unknown>;
  stabilizationReadinessReport: Record<string, unknown>;
  suggestions: GovernanceFreezeSuggestion[];
  profile: RuntimeGovernanceFreezeProfile | null;
};
