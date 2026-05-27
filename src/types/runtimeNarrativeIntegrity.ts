export type NarrativeIntegrityFlow =
  | 'narrative_integrity_flow'
  | 'recursive_narrative_inflation'
  | 'semantic_drift_accumulation'
  | 'explanation_loop_fixation'
  | 'narrative_lock_in'
  | 'coherence_mythology'
  | 'storyline_self_reinforcement'
  | 'cross_layer_semantic_consistency'
  | 'long_session_narrative_drift'
  | 'narrative_evolution';

export type NarrativeGraphNode = { id: string; label: string; score: number };
export type NarrativeGraphEdge = { from: string; to: string; weight: number };

export type NarrativeGraphSnapshot = {
  nodes: NarrativeGraphNode[];
  edges: NarrativeGraphEdge[];
  measuredAt: string;
};

export type NarrativeIntegrityTimelineEntry = {
  at: string;
  flow: NarrativeIntegrityFlow;
  detailJa: string;
};

export type RuntimeNarrativeIntegrityProfile = {
  runtimeNarrativeIntegrityScore: number;
  recursiveNarrativeInflationRisk: number;
  runtimeSemanticDriftRisk: number;
  explanationLoopFixationRisk: number;
  runtimeNarrativeLockRisk: number;
  coherenceMythologyRisk: number;
  storylineSelfReinforcementRisk: number;
  crossLayerSemanticConsistency: number;
  runtimeNarrativeDriftRisk: number;
  runtimeNarrativeConfidence: number;
  semanticVarianceScore: number;
  storylineRecursionScore: number;
  interpretationPersistenceScore: number;
  narrativeRigidityScore: number;
  measuredAt: string;
};

export type RuntimeNarrativeIntegrityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeNarrativeIntegrityProfile;
  narrativeIntegrityEvolution: { at: string; score: number }[];
  narrativeEvolution: { at: string; variance: number }[];
  recursiveNarrativeGraph: NarrativeGraphSnapshot;
  crossLayerSemanticGraph: NarrativeGraphSnapshot;
  narrativeDriftSignals: string[];
  timelineRecent: NarrativeIntegrityTimelineEntry[];
};

export type RuntimeNarrativeIntegrityObserveInput = {
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
};

export type RuntimeNarrativeIntegrityExportBundle = {
  version: string;
  exportedAt: string;
  narrativeIntegrityReport: Record<string, unknown>;
  recursiveNarrativeAnalysis: Record<string, unknown>;
  semanticDriftReport: Record<string, unknown>;
  explanationFixationReport: Record<string, unknown>;
  narrativeLockReport: Record<string, unknown>;
  coherenceMythologyReport: Record<string, unknown>;
  storylineReinforcementReport: Record<string, unknown>;
  narrativeEvolutionReport: Record<string, unknown>;
  profile: RuntimeNarrativeIntegrityProfile | null;
};
