export type PurposeIntegrityFlow =
  | 'purpose_integrity'
  | 'purpose_drift_detection'
  | 'stability_addiction_detection'
  | 'orchestration_hollowing'
  | 'utility_preservation_equilibrium'
  | 'intervention_value_efficiency'
  | 'survivability_usefulness_divergence'
  | 'observer_purpose_imbalance'
  | 'governance_overreach'
  | 'long_session_value_erosion';

export type PurposeGraphNode = { id: string; label: string; score: number };
export type PurposeGraphEdge = { from: string; to: string; weight: number };

export type PurposeGraphSnapshot = {
  nodes: PurposeGraphNode[];
  edges: PurposeGraphEdge[];
  measuredAt: string;
};

export type PurposeIntegrityTimelineEntry = {
  at: string;
  flow: PurposeIntegrityFlow;
  detailJa: string;
};

export type RuntimePurposeIntegrityProfile = {
  runtimePurposeIntegrityScore: number;
  runtimePurposeDriftRisk: number;
  runtimeStabilityAddictionScore: number;
  runtimeHollowingRisk: number;
  runtimeUtilityIntegrity: number;
  interventionEfficiencyScore: number;
  runtimeUsefulnessDivergenceRisk: number;
  observerPurposeBalance: number;
  runtimeGovernanceOverreachRisk: number;
  longSessionPurposeIntegrity: number;
  utilityEquilibriumConfidence: number;
  observerOverPersistenceRisk: number;
  survivabilityUtilitySpread: number;
  utilityPerIntervention: number;
  valueDilutionRisk: number;
  measuredAt: string;
};

export type RuntimePurposeIntegrityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimePurposeIntegrityProfile;
  purposeEvolutionTimeline: { at: string; score: number }[];
  stabilityAddictionTimeline: { at: string; addiction: number }[];
  interventionEfficiencyTimeline: { at: string; efficiency: number }[];
  governancePressureTimeline: { at: string; pressure: number }[];
  valueErosionEvolution: { at: string; erosion: number }[];
  utilityEquilibriumGraph: PurposeGraphSnapshot;
  purposeDriftSignals: string[];
  timelineRecent: PurposeIntegrityTimelineEntry[];
};

export type RuntimePurposeIntegrityObserveInput = {
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
};

export type RuntimePurposeIntegrityExportBundle = {
  version: string;
  exportedAt: string;
  purposeIntegrityReport: Record<string, unknown>;
  purposeDriftAnalysis: Record<string, unknown>;
  stabilityAddictionReport: Record<string, unknown>;
  orchestrationHollowingReport: Record<string, unknown>;
  utilityEquilibriumAnalysis: Record<string, unknown>;
  interventionEfficiencyReport: Record<string, unknown>;
  governanceOverreachReport: Record<string, unknown>;
  longSessionValueErosionReport: Record<string, unknown>;
  profile: RuntimePurposeIntegrityProfile | null;
};
