export type MetaCognitionFlow =
  | 'meta_cognition_flow'
  | 'recursive_self_observation_inflation'
  | 'observer_self_reference_lock'
  | 'meta_cognitive_rigidity'
  | 'introspection_dependency'
  | 'recursive_audit_fixation'
  | 'self_model_drift'
  | 'cross_layer_self_consistency'
  | 'long_session_introspection_drift'
  | 'meta_cognition_evolution';

export type MetaCognitionGraphNode = { id: string; label: string; score: number };
export type MetaCognitionGraphEdge = { from: string; to: string; weight: number };

export type MetaCognitionGraphSnapshot = {
  nodes: MetaCognitionGraphNode[];
  edges: MetaCognitionGraphEdge[];
  measuredAt: string;
};

export type MetaCognitionTimelineEntry = {
  at: string;
  flow: MetaCognitionFlow;
  detailJa: string;
};

export type RuntimeMetaCognitionProfile = {
  runtimeMetaCognitionScore: number;
  recursiveSelfObservationRisk: number;
  observerSelfReferenceLockRisk: number;
  metaCognitiveRigidityRisk: number;
  runtimeIntrospectionDependencyRisk: number;
  recursiveAuditFixationRisk: number;
  runtimeSelfModelDriftRisk: number;
  crossLayerSelfConsistency: number;
  runtimeIntrospectionDriftRisk: number;
  runtimeMetaCognitionConfidence: number;
  metaVarianceScore: number;
  auditRigidityScore: number;
  observerRecursionMetaScore: number;
  coherenceInflationScore: number;
  measuredAt: string;
};

export type RuntimeMetaCognitionDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeMetaCognitionProfile;
  metaCognitionEvolution: { at: string; score: number }[];
  metaEvolution: { at: string; variance: number }[];
  recursiveSelfObservationGraph: MetaCognitionGraphSnapshot;
  crossLayerSelfGraph: MetaCognitionGraphSnapshot;
  introspectionDriftSignals: string[];
  timelineRecent: MetaCognitionTimelineEntry[];
};

export type RuntimeMetaCognitionObserveInput = {
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
};

export type RuntimeMetaCognitionExportBundle = {
  version: string;
  exportedAt: string;
  metaCognitionReport: Record<string, unknown>;
  recursiveSelfObservationAnalysis: Record<string, unknown>;
  observerLockReport: Record<string, unknown>;
  introspectionDependencyReport: Record<string, unknown>;
  auditFixationReport: Record<string, unknown>;
  selfModelDriftReport: Record<string, unknown>;
  coherenceRigidityReport: Record<string, unknown>;
  metaCognitionEvolutionReport: Record<string, unknown>;
  profile: RuntimeMetaCognitionProfile | null;
};
