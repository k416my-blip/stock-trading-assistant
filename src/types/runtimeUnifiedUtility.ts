export type UnifiedUtilityFlow =
  | 'unified_utility_field'
  | 'existential_constraint_model'
  | 'goal_fragmentation_detection'
  | 'utility_distortion_detection'
  | 'governance_inflation_tracking'
  | 'stability_addiction_analysis'
  | 'observer_civilization_risk'
  | 'cross_layer_utility_harmonization'
  | 'long_session_existential_drift'
  | 'utility_equilibrium_evolution';

export type UtilityGraphNode = { id: string; label: string; score: number };
export type UtilityGraphEdge = { from: string; to: string; weight: number };

export type UtilityGraphSnapshot = {
  nodes: UtilityGraphNode[];
  edges: UtilityGraphEdge[];
  measuredAt: string;
};

export type UnifiedUtilityTimelineEntry = {
  at: string;
  flow: UnifiedUtilityFlow;
  detailJa: string;
};

export type RuntimeUnifiedUtilityProfile = {
  runtimeUnifiedUtilityScore: number;
  runtimeExistentialConstraintRisk: number;
  objectiveFragmentationRisk: number;
  runtimeUtilityDistortionScore: number;
  runtimeGovernanceInflationRisk: number;
  runtimeStabilityAddictionRisk: number;
  observerCivilizationRisk: number;
  crossLayerUtilityConsistency: number;
  runtimeExistentialDriftRisk: number;
  runtimeUnifiedUtilityConfidence: number;
  utilityEquilibriumVariance: number;
  strategicIntegrityScore: number;
  purposeConsistencyScore: number;
  utilityPersistenceScore: number;
  measuredAt: string;
};

export type RuntimeUnifiedUtilityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeUnifiedUtilityProfile;
  unifiedUtilityEvolution: { at: string; score: number }[];
  equilibriumEvolution: { at: string; variance: number }[];
  objectiveFragmentationGraph: UtilityGraphSnapshot;
  crossLayerUtilityGraph: UtilityGraphSnapshot;
  existentialConstraintSignals: string[];
  timelineRecent: UnifiedUtilityTimelineEntry[];
};

export type RuntimeUnifiedUtilityObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  jsHeapMb: number;
  memoryTrendPct: number;
  thermalState: string;
  appForeground: boolean;
  screenOff: boolean;
  batterySaver: boolean;
  miuiAggressiveReclaim: boolean;
  sessionMinutes: number;
  hydrationOverlapCount: number;
  bridgeTrafficRate: number;
  renderStormRisk: number;
  reconnectPerMin: number;
  wsDuplicateCount: number;
  heartbeatAgeMs: number;
  recoverySuccessRate: number;
  continuityScore: number;
  jsSurvivalScore: number;
  observerOverheadRatio: number;
  governanceConfidence: number;
  runtimeSafeTradingScore: number;
  runtimeTradingSuppression: number;
  equilibriumScore: number;
  metaCoordinationStability: number;
  runtimeAmplificationRisk: number;
  telemetryAmplificationScore: number;
  runtimeEntropyScore: number;
  loadSheddingSeverity: number;
  runtimeEquilibriumStability: number;
  staleHydrationRisk: number;
  interventionDensity: number;
  survivabilityEffectiveness: number;
  runtimeComplexityScore: number;
  simplificationIntegrity: number;
  runtimeHomeostasisScore: number;
  runtimeStrategicCoherence: number;
  runtimeAuditCoverage: number;
  runtimeSelfLimitationScore: number;
  metaRecursionRisk: number;
  runtimeCalmnessIndex: number;
  equilibriumPersistence: number;
  orchestrationEdgeCount: number;
  observerDensityScore: number;
  objectiveAlignmentScore: number;
  runtimePurposeIntegrityScore: number;
  runtimePurposeDriftRisk: number;
  runtimeUtilityIntegrity: number;
  longSessionPurposeIntegrity: number;
  valueDilutionRisk: number;
  runtimeCompressionEfficiency: number;
  runtimeLeanStability: number;
  layerConflictRisk: number;
};

export type RuntimeUnifiedUtilityExportBundle = {
  version: string;
  exportedAt: string;
  unifiedUtilityReport: Record<string, unknown>;
  existentialConstraintAnalysis: Record<string, unknown>;
  governanceInflationReport: Record<string, unknown>;
  utilityDistortionReport: Record<string, unknown>;
  objectiveFragmentationReport: Record<string, unknown>;
  observerCivilizationReport: Record<string, unknown>;
  existentialDriftReport: Record<string, unknown>;
  equilibriumEvolutionReport: Record<string, unknown>;
  profile: RuntimeUnifiedUtilityProfile | null;
};
