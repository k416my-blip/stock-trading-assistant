export type ComplexityCompressionFlow =
  | 'complexity_analysis'
  | 'redundancy_detection'
  | 'recursive_stabilization'
  | 'autonomous_pruning'
  | 'observer_value_scoring'
  | 'runtime_compression'
  | 'noise_reduction'
  | 'lean_mode_orchestration'
  | 'complexity_equilibrium'
  | 'long_session_simplification';

export type CompressionGraphNode = { id: string; label: string; score: number };
export type CompressionGraphEdge = { from: string; to: string; weight: number };

export type CompressionGraphSnapshot = {
  nodes: CompressionGraphNode[];
  edges: CompressionGraphEdge[];
  measuredAt: string;
};

export type ComplexityCompressionTimelineEntry = {
  at: string;
  flow: ComplexityCompressionFlow;
  detailJa: string;
};

export type ComplexityCompressionProfile = {
  runtimeComplexityScore: number;
  observerRedundancyRisk: number;
  telemetryAmplificationCost: number;
  recursiveStabilizationRisk: number;
  runtimeBloatScore: number;
  interventionValueDensity: number;
  runtimeCompressionEfficiency: number;
  runtimeNoiseRatio: number;
  simplificationIntegrity: number;
  runtimeLeanStability: number;
  orchestrationInflationRisk: number;
  autonomousPruningConfidence: number;
  pacingConflictDensity: number;
  observerValueScore: number;
  runtimeEntropyCompressionRate: number;
  measuredAt: string;
};

export type ComplexityCompressionDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: ComplexityCompressionProfile;
  complexityEvolution: { at: string; score: number }[];
  observerRedundancyGraph: CompressionGraphSnapshot;
  recursiveStabilizationMap: CompressionGraphSnapshot;
  orchestrationInflationGraph: CompressionGraphSnapshot;
  telemetryAmplificationHeatmap: Record<string, number>;
  interventionValueDistribution: { label: string; value: number }[];
  compressionEfficiencyTimeline: { at: string; efficiency: number }[];
  leanModeTransitionGraph: CompressionGraphSnapshot;
  equilibriumEvolution: { at: string; integrity: number }[];
  timelineRecent: ComplexityCompressionTimelineEntry[];
};

export type ComplexityCompressionObserveInput = {
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
  observerDensityScore: number;
  runtimeAuditCoverage: number;
  survivabilityEffectiveness: number;
  observerCountEstimate: number;
  pacingLayerCount: number;
  recoveryChainLength: number;
  orchestrationEdgeCount: number;
};

export type ComplexityCompressionExportBundle = {
  version: string;
  exportedAt: string;
  complexityAnalysisReport: Record<string, unknown>;
  redundancyReport: Record<string, unknown>;
  recursionAnalysis: Record<string, unknown>;
  observerValueReport: Record<string, unknown>;
  compressionEfficiencyReport: Record<string, unknown>;
  leanModeReport: Record<string, unknown>;
  orchestrationInflationReport: Record<string, unknown>;
  simplificationEquilibriumReport: Record<string, unknown>;
  profile: ComplexityCompressionProfile | null;
};
