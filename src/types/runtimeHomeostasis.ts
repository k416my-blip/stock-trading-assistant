export type HomeostasisFlow =
  | 'runtime_homeostasis'
  | 'stability_drift_detection'
  | 'intervention_fatigue_balancing'
  | 'oscillation_neutralization'
  | 'adaptive_equilibrium_pacing'
  | 'calm_state_coordination'
  | 'homeostatic_recovery_balancing'
  | 'cross_layer_equilibrium'
  | 'long_session_homeostasis'
  | 'self_regulation_preservation';

export type HomeostasisGraphNode = { id: string; label: string; score: number };
export type HomeostasisGraphEdge = { from: string; to: string; weight: number };

export type HomeostasisGraphSnapshot = {
  nodes: HomeostasisGraphNode[];
  edges: HomeostasisGraphEdge[];
  measuredAt: string;
};

export type HomeostasisTimelineEntry = {
  at: string;
  flow: HomeostasisFlow;
  detailJa: string;
};

export type RuntimeHomeostasisProfile = {
  runtimeHomeostasisScore: number;
  stabilityDriftRisk: number;
  interventionFatigueLevel: number;
  equilibriumIntegrity: number;
  runtimeCalmnessIndex: number;
  adaptiveStabilityBalance: number;
  stabilizationOscillationRisk: number;
  homeostaticRecoveryBalance: number;
  runtimeSelfRegulationScore: number;
  equilibriumPersistence: number;
  runtimeHarmonyIndex: number;
  crossLayerStabilityConsistency: number;
  longSessionHomeostasis: number;
  runtimeInterventionPressure: number;
  adaptiveEquilibriumConfidence: number;
  measuredAt: string;
};

export type RuntimeHomeostasisDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeHomeostasisProfile;
  equilibriumEvolution: { at: string; score: number }[];
  interventionFatigueTimeline: { at: string; fatigue: number }[];
  stabilityDriftGraph: HomeostasisGraphSnapshot;
  oscillationSuppressionMap: HomeostasisGraphSnapshot;
  calmStateTransitionGraph: HomeostasisGraphSnapshot;
  crossLayerEquilibriumGraph: HomeostasisGraphSnapshot;
  stabilizationPressureHeatmap: Record<string, number>;
  adaptivePacingEvolution: { at: string; pacing: number }[];
  homeostaticRecoveryGraph: HomeostasisGraphSnapshot;
  longSessionEquilibriumTimeline: { at: string; homeostasis: number }[];
  timelineRecent: HomeostasisTimelineEntry[];
};

export type RuntimeHomeostasisObserveInput = {
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
  runtimeLeanStability: number;
  recursiveStabilizationRisk: number;
  runtimeAuditCoverage: number;
  pacingDriftEstimate: number;
  suppressionDriftEstimate: number;
  compressionDriftEstimate: number;
};

export type RuntimeHomeostasisExportBundle = {
  version: string;
  exportedAt: string;
  runtimeHomeostasisReport: Record<string, unknown>;
  equilibriumAnalysis: Record<string, unknown>;
  interventionFatigueReport: Record<string, unknown>;
  stabilityDriftAnalysis: Record<string, unknown>;
  oscillationSuppressionReport: Record<string, unknown>;
  homeodynamicEvolutionReport: Record<string, unknown>;
  crossLayerEquilibriumReport: Record<string, unknown>;
  runtimeCalmStateReport: Record<string, unknown>;
  profile: RuntimeHomeostasisProfile | null;
};
