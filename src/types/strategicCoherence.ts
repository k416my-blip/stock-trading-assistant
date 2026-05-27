export type StrategicCoherenceFlow =
  | 'global_objective_alignment'
  | 'layer_conflict_detection'
  | 'strategic_arbitration'
  | 'utility_equilibrium'
  | 'intent_preservation'
  | 'strategic_pacing_harmonization'
  | 'cross_layer_consistency'
  | 'long_session_persistence'
  | 'strategic_compression_harmonization'
  | 'equilibrium_evolution';

export type StrategicGraphNode = { id: string; label: string; score: number };
export type StrategicGraphEdge = { from: string; to: string; weight: number };

export type StrategicGraphSnapshot = {
  nodes: StrategicGraphNode[];
  edges: StrategicGraphEdge[];
  measuredAt: string;
};

export type StrategicCoherenceTimelineEntry = {
  at: string;
  flow: StrategicCoherenceFlow;
  detailJa: string;
};

export type StrategicCoherenceProfile = {
  runtimeStrategicCoherence: number;
  objectiveAlignmentScore: number;
  layerConflictRisk: number;
  strategicConsistency: number;
  runtimeUtilityIntegrity: number;
  interventionPriorityStability: number;
  strategicDriftRisk: number;
  runtimeIntentIntegrity: number;
  crossLayerObjectiveConsistency: number;
  runtimeStrategicPersistence: number;
  globalUtilityBalance: number;
  strategicCompressionIntegrity: number;
  continuityUtilityScore: number;
  adaptiveObjectiveConfidence: number;
  runtimeStrategicHarmony: number;
  measuredAt: string;
};

export type StrategicCoherenceDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: StrategicCoherenceProfile;
  coherenceEvolution: { at: string; score: number }[];
  objectiveAlignmentGraph: StrategicGraphSnapshot;
  layerConflictMap: StrategicGraphSnapshot;
  utilityEquilibriumGraph: StrategicGraphSnapshot;
  interventionPriorityTimeline: { at: string; priority: number }[];
  strategicDriftEvolution: { at: string; drift: number }[];
  crossLayerConsistencyGraph: StrategicGraphSnapshot;
  strategicPacingHarmonizationMap: StrategicGraphSnapshot;
  continuityUtilityEvolution: { at: string; utility: number }[];
  strategicEquilibriumTimeline: { at: string; equilibrium: number }[];
  timelineRecent: StrategicCoherenceTimelineEntry[];
};

export type StrategicCoherenceObserveInput = {
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
  runtimeCompressionEfficiency: number;
  runtimeHomeostasisScore: number;
  equilibriumIntegrity: number;
  runtimeCalmnessIndex: number;
  runtimeAuditCoverage: number;
  observerSuppressionLoss: number;
  stabilityDriftRisk: number;
};

export type StrategicCoherenceExportBundle = {
  version: string;
  exportedAt: string;
  strategicCoherenceReport: Record<string, unknown>;
  objectiveAlignmentAnalysis: Record<string, unknown>;
  layerConflictReport: Record<string, unknown>;
  utilityEquilibriumAnalysis: Record<string, unknown>;
  strategicDriftReport: Record<string, unknown>;
  runtimeIntentIntegrityReport: Record<string, unknown>;
  crossLayerConsistencyReport: Record<string, unknown>;
  strategicEquilibriumEvolutionReport: Record<string, unknown>;
  profile: StrategicCoherenceProfile | null;
};
