export type SelfLimitationFlow =
  | 'self_limitation'
  | 'meta_recursion_detection'
  | 'orchestration_ego_suppression'
  | 'adaptive_ceiling_enforcement'
  | 'stabilization_budget_governance'
  | 'self_protection_bias_detection'
  | 'observer_ideology_lock'
  | 'recursive_equilibrium_inflation'
  | 'long_session_self_expansion'
  | 'meta_cognitive_boundary';

export type LimitationGraphNode = { id: string; label: string; score: number };
export type LimitationGraphEdge = { from: string; to: string; weight: number };

export type LimitationGraphSnapshot = {
  nodes: LimitationGraphNode[];
  edges: LimitationGraphEdge[];
  measuredAt: string;
};

export type SelfLimitationTimelineEntry = {
  at: string;
  flow: SelfLimitationFlow;
  detailJa: string;
};

export type RuntimeSelfLimitationProfile = {
  runtimeSelfLimitationScore: number;
  metaRecursionRisk: number;
  runtimeEgoScore: number;
  stabilizationBudgetPressure: number;
  runtimeAdaptiveInflationRisk: number;
  runtimeSelfProtectionBias: number;
  observerIdeologyLockRisk: number;
  recursiveEquilibriumInflation: number;
  runtimeBoundaryIntegrity: number;
  runtimeMetaCognitivePressure: number;
  observerRigidityScore: number;
  runtimeSelfLimitationConfidence: number;
  selfPreservationDriftRisk: number;
  stabilizationInertia: number;
  interventionMomentum: number;
  measuredAt: string;
};

export type RuntimeSelfLimitationDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeSelfLimitationProfile;
  selfLimitationEvolution: { at: string; score: number }[];
  metaRecursionGraph: LimitationGraphSnapshot;
  orchestrationEgoAnalysis: { signals: string[]; egoScore: number };
  stabilizationBudgetReport: { cost: number; pressure: number };
  selfProtectionBiasReport: { biases: string[]; score: number };
  observerIdeologyLockReport: { rigidity: number; lockRisk: number };
  equilibriumInflationReport: LimitationGraphSnapshot;
  metaBoundaryEvolution: { at: string; integrity: number }[];
  timelineRecent: SelfLimitationTimelineEntry[];
};

export type RuntimeSelfLimitationObserveInput = {
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
  equilibriumIntegrity: number;
  runtimeStrategicCoherence: number;
  objectiveAlignmentScore: number;
  layerConflictRisk: number;
  runtimeAuditCoverage: number;
  observerDensityScore: number;
  orchestrationEdgeCount: number;
  recursiveStabilizationRisk: number;
  equilibriumPersistence: number;
  runtimeCalmnessIndex: number;
};

export type RuntimeSelfLimitationExportBundle = {
  version: string;
  exportedAt: string;
  selfLimitationReport: Record<string, unknown>;
  recursionAnalysis: Record<string, unknown>;
  orchestrationEgoAnalysis: Record<string, unknown>;
  stabilizationBudgetReport: Record<string, unknown>;
  selfProtectionBiasReport: Record<string, unknown>;
  observerIdeologyLockReport: Record<string, unknown>;
  equilibriumInflationReport: Record<string, unknown>;
  metaBoundaryEvolutionReport: Record<string, unknown>;
  profile: RuntimeSelfLimitationProfile | null;
};
