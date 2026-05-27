export type SurvivabilityAuditFlow =
  | 'effectiveness_validation'
  | 'blind_spot_detection'
  | 'recovery_side_effect'
  | 'overfitting_detection'
  | 'stabilization_cost'
  | 'equilibrium_validation'
  | 'long_session_audit'
  | 'continuity_validation'
  | 'resilience_evolution';

export type AuditGraphNode = { id: string; label: string; score: number };
export type AuditGraphEdge = { from: string; to: string; weight: number };

export type AuditGraphSnapshot = {
  nodes: AuditGraphNode[];
  edges: AuditGraphEdge[];
  measuredAt: string;
};

export type SurvivabilityAuditTimelineEntry = {
  at: string;
  flow: SurvivabilityAuditFlow;
  detailJa: string;
};

export type SurvivabilityAuditProfile = {
  survivabilityEffectiveness: number;
  runtimeBlindSpotRisk: number;
  observerSuppressionLoss: number;
  recoverySideEffectRisk: number;
  runtimeAuditCoverage: number;
  stabilizationCostEfficiency: number;
  survivabilityOverfittingRisk: number;
  runtimeEquilibriumIntegrity: number;
  continuityIntegrityScore: number;
  runtimeResilienceScore: number;
  runtimeValidationConfidence: number;
  runtimeAuditConsistency: number;
  pacingIntegrityScore: number;
  telemetryCoverageIntegrity: number;
  longSessionStabilityIntegrity: number;
  measuredAt: string;
};

export type SurvivabilityAuditDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: SurvivabilityAuditProfile;
  effectivenessEvolution: { at: string; score: number }[];
  blindSpotMap: AuditGraphSnapshot;
  recoverySideEffectChain: string[];
  stabilizationCostGraph: AuditGraphSnapshot;
  continuityIntegrityTimeline: { at: string; score: number }[];
  resilienceEvolution: { at: string; score: number }[];
  auditConfidenceTimeline: { at: string; confidence: number }[];
  overfittingHeatmap: Record<string, number>;
  timelineRecent: SurvivabilityAuditTimelineEntry[];
};

export type SurvivabilityAuditObserveInput = {
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
};

export type SurvivabilityAuditExportBundle = {
  version: string;
  exportedAt: string;
  survivabilityAuditReport: Record<string, unknown>;
  blindSpotAnalysis: Record<string, unknown>;
  recoverySideEffectReport: Record<string, unknown>;
  stabilizationCostReport: Record<string, unknown>;
  continuityValidationReport: Record<string, unknown>;
  resilienceEvolutionReport: { at: string; score: number }[];
  overfittingAnalysis: Record<string, number>;
  runtimeAuditConfidenceReport: Record<string, unknown>;
  profile: SurvivabilityAuditProfile | null;
};
