export type AgencyIntegrityFlow =
  | 'agency_flow'
  | 'recursive_autonomy_inflation'
  | 'constraint_erosion_monitor'
  | 'observer_agency_fusion'
  | 'governance_autonomy_creep'
  | 'recursive_intervention_persistence'
  | 'equilibrium_dependency_lock'
  | 'cross_layer_agency_consistency'
  | 'long_session_autonomy_drift'
  | 'agency_evolution';

export type AgencyGraphNode = { id: string; label: string; score: number };
export type AgencyGraphEdge = { from: string; to: string; weight: number };

export type AgencyGraphSnapshot = {
  nodes: AgencyGraphNode[];
  edges: AgencyGraphEdge[];
  measuredAt: string;
};

export type AgencyIntegrityTimelineEntry = {
  at: string;
  flow: AgencyIntegrityFlow;
  detailJa: string;
};

export type RuntimeAgencyIntegrityProfile = {
  runtimeAgencyIntegrityScore: number;
  recursiveAutonomyInflationRisk: number;
  runtimeConstraintErosionRisk: number;
  observerAgencyFusionRisk: number;
  runtimeGovernanceAutonomyRisk: number;
  recursiveInterventionPersistenceRisk: number;
  runtimeEquilibriumDependencyRisk: number;
  crossLayerAgencyConsistency: number;
  runtimeAutonomyDriftRisk: number;
  runtimeAgencyConfidence: number;
  agencyVarianceScore: number;
  constraintStabilityScore: number;
  observerRecursionAgencyScore: number;
  autonomyRigidityScore: number;
  measuredAt: string;
};

export type RuntimeAgencyIntegrityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeAgencyIntegrityProfile;
  agencyIntegrityEvolution: { at: string; score: number }[];
  agencyEvolution: { at: string; variance: number }[];
  recursiveAutonomyGraph: AgencyGraphSnapshot;
  crossLayerAgencyGraph: AgencyGraphSnapshot;
  autonomyDriftSignals: string[];
  timelineRecent: AgencyIntegrityTimelineEntry[];
};

export type RuntimeAgencyIntegrityObserveInput = {
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
  runtimeUnifiedUtilityScore: number;
  runtimeExistentialConstraintRisk: number;
  crossLayerUtilityConsistency: number;
  observerCivilizationRisk: number;
  runtimeGovernanceInflationRisk: number;
  runtimeExistentialDriftRisk: number;
  runtimeUnifiedUtilityConfidence: number;
  runtimeCivilizationScore: number;
  recursiveGovernanceEcologyRisk: number;
  runtimeUtilityMonocultureRisk: number;
  observerEcosystemInflationRisk: number;
  runtimeStabilityIdeologyRisk: number;
  runtimeOrchestrationCivilizationRisk: number;
  crossLayerEcologyIntegrity: number;
  runtimeCivilizationDriftRisk: number;
  runtimeEcologicalConfidence: number;
  runtimeRealityIntegrityScore: number;
  recursiveBeliefReinforcementRisk: number;
  runtimeRealityDistortionRisk: number;
  observerConfirmationLoopRisk: number;
  runtimeEpistemologyInflationRisk: number;
  runtimeEquilibriumHallucinationRisk: number;
  runtimeWorldviewLockRisk: number;
  crossLayerEpistemicConsistency: number;
  runtimeEpistemicDriftRisk: number;
  runtimeEpistemicConfidence: number;
};

export type RuntimeAgencyIntegrityExportBundle = {
  version: string;
  exportedAt: string;
  agencyIntegrityReport: Record<string, unknown>;
  recursiveAutonomyAnalysis: Record<string, unknown>;
  constraintErosionReport: Record<string, unknown>;
  observerFusionReport: Record<string, unknown>;
  governanceAutonomyReport: Record<string, unknown>;
  equilibriumDependencyReport: Record<string, unknown>;
  autonomyDriftReport: Record<string, unknown>;
  agencyEvolutionReport: Record<string, unknown>;
  profile: RuntimeAgencyIntegrityProfile | null;
};
