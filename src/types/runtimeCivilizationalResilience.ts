export type CivilizationalEcologyFlow =
  | 'civilization_flow'
  | 'recursive_governance_ecology'
  | 'utility_monoculture_detection'
  | 'observer_ecosystem_inflation'
  | 'stability_ideology_fixation'
  | 'orchestration_civilization_persistence'
  | 'governance_biodiversity_analysis'
  | 'cross_layer_ecological_balance'
  | 'long_session_civilization_drift'
  | 'ecological_equilibrium_evolution';

export type EcologyGraphNode = { id: string; label: string; score: number };
export type EcologyGraphEdge = { from: string; to: string; weight: number };

export type EcologyGraphSnapshot = {
  nodes: EcologyGraphNode[];
  edges: EcologyGraphEdge[];
  measuredAt: string;
};

export type CivilizationalEcologyTimelineEntry = {
  at: string;
  flow: CivilizationalEcologyFlow;
  detailJa: string;
};

export type RuntimeCivilizationalResilienceProfile = {
  runtimeCivilizationScore: number;
  recursiveGovernanceEcologyRisk: number;
  runtimeUtilityMonocultureRisk: number;
  observerEcosystemInflationRisk: number;
  runtimeStabilityIdeologyRisk: number;
  runtimeOrchestrationCivilizationRisk: number;
  governanceBiodiversityScore: number;
  crossLayerEcologyIntegrity: number;
  runtimeCivilizationDriftRisk: number;
  runtimeEcologicalConfidence: number;
  ecosystemPersistenceScore: number;
  governanceVarianceScore: number;
  utilityDiversityScore: number;
  civilizationSpreadScore: number;
  measuredAt: string;
};

export type RuntimeCivilizationalResilienceDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeCivilizationalResilienceProfile;
  civilizationEvolution: { at: string; score: number }[];
  ecologicalEvolution: { at: string; spread: number }[];
  recursiveGovernanceGraph: EcologyGraphSnapshot;
  crossLayerEcologyGraph: EcologyGraphSnapshot;
  civilizationDriftSignals: string[];
  timelineRecent: CivilizationalEcologyTimelineEntry[];
};

export type RuntimeCivilizationalResilienceObserveInput = {
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
};

export type RuntimeCivilizationalResilienceExportBundle = {
  version: string;
  exportedAt: string;
  civilizationEcologyReport: Record<string, unknown>;
  recursiveGovernanceAnalysis: Record<string, unknown>;
  utilityMonocultureReport: Record<string, unknown>;
  observerEcosystemReport: Record<string, unknown>;
  orchestrationCivilizationReport: Record<string, unknown>;
  governanceBiodiversityReport: Record<string, unknown>;
  civilizationDriftReport: Record<string, unknown>;
  ecologicalEvolutionReport: Record<string, unknown>;
  profile: RuntimeCivilizationalResilienceProfile | null;
};
