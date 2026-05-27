export type EpistemicIntegrityFlow =
  | 'reality_modeling_flow'
  | 'recursive_belief_reinforcement'
  | 'utility_reality_distortion'
  | 'observer_confirmation_loop'
  | 'governance_epistemology_inflation'
  | 'equilibrium_hallucination_detection'
  | 'orchestration_worldview_lock'
  | 'cross_layer_epistemic_consistency'
  | 'long_session_epistemic_drift'
  | 'epistemic_evolution';

export type EpistemicGraphNode = { id: string; label: string; score: number };
export type EpistemicGraphEdge = { from: string; to: string; weight: number };

export type EpistemicGraphSnapshot = {
  nodes: EpistemicGraphNode[];
  edges: EpistemicGraphEdge[];
  measuredAt: string;
};

export type EpistemicIntegrityTimelineEntry = {
  at: string;
  flow: EpistemicIntegrityFlow;
  detailJa: string;
};

export type RuntimeEpistemicIntegrityProfile = {
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
  beliefVarianceScore: number;
  realitySpreadScore: number;
  observerRecursionScore: number;
  epistemicRigidityScore: number;
  worldviewDiversityScore: number;
  measuredAt: string;
};

export type RuntimeEpistemicIntegrityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeEpistemicIntegrityProfile;
  realityIntegrityEvolution: { at: string; score: number }[];
  epistemicEvolution: { at: string; variance: number }[];
  recursiveBeliefGraph: EpistemicGraphSnapshot;
  crossLayerEpistemicGraph: EpistemicGraphSnapshot;
  epistemicDriftSignals: string[];
  timelineRecent: EpistemicIntegrityTimelineEntry[];
};

export type RuntimeEpistemicIntegrityObserveInput = {
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
};

export type RuntimeEpistemicIntegrityExportBundle = {
  version: string;
  exportedAt: string;
  epistemicIntegrityReport: Record<string, unknown>;
  recursiveBeliefAnalysis: Record<string, unknown>;
  realityDistortionReport: Record<string, unknown>;
  observerConfirmationReport: Record<string, unknown>;
  governanceEpistemologyReport: Record<string, unknown>;
  worldviewLockReport: Record<string, unknown>;
  epistemicDriftReport: Record<string, unknown>;
  epistemicEvolutionReport: Record<string, unknown>;
  profile: RuntimeEpistemicIntegrityProfile | null;
};
