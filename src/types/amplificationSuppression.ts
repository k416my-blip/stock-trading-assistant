export type AmplificationSuppressionFlow =
  | 'amplification_detection'
  | 'observer_cascade_suppression'
  | 'recovery_amplification_guard'
  | 'autonomous_load_shedding'
  | 'thermal_amplification_suppression'
  | 'websocket_storm_suppression'
  | 'background_starvation_handling'
  | 'entropy_stabilization'
  | 'stabilization_equilibrium';

export type AmplificationGraphNode = {
  id: string;
  label: string;
  density: number;
};

export type AmplificationGraphEdge = {
  from: string;
  to: string;
  amplification: number;
};

export type AmplificationGraphSnapshot = {
  nodes: AmplificationGraphNode[];
  edges: AmplificationGraphEdge[];
  measuredAt: string;
};

export type AmplificationTimelineEntry = {
  at: string;
  flow: AmplificationSuppressionFlow;
  detailJa: string;
};

export type AmplificationSuppressionProfile = {
  runtimeAmplificationRisk: number;
  observerCascadeRisk: number;
  telemetryRecursionRisk: number;
  recoveryAmplificationRisk: number;
  runtimeInterventionDensity: number;
  observerDensityScore: number;
  stabilizationOverhead: number;
  runtimeEntropyScore: number;
  amplificationPressure: number;
  loadSheddingSeverity: number;
  recursiveOrchestrationRisk: number;
  survivabilityCost: number;
  websocketStormRisk: number;
  thermalAmplificationPressure: number;
  runtimeEquilibriumStability: number;
  measuredAt: string;
};

export type AmplificationSuppressionDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: AmplificationSuppressionProfile;
  propagationGraph: AmplificationGraphSnapshot;
  observerDensityEvolution: { at: string; density: number }[];
  telemetryRecursionMap: Record<string, number>;
  entropyTimeline: { at: string; entropy: number }[];
  loadSheddingTimeline: AmplificationTimelineEntry[];
  recoveryAmplificationChain: string[];
  equilibriumGraph: AmplificationGraphSnapshot;
  timelineRecent: AmplificationTimelineEntry[];
};

export type AmplificationSuppressionObserveInput = {
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
  observerOverheadRatio: number;
  governanceMode: string;
  telemetryAmplificationScore: number;
  interventionDensity: number;
  runtimeTradingSuppression: number;
  equilibriumScore: number;
  metaCoordinationStability: number;
  runtimeAmplificationRisk: number;
};

export type AmplificationSuppressionExportBundle = {
  version: string;
  exportedAt: string;
  amplificationIncidentReport: Record<string, unknown>;
  observerSuppressionHistory: Record<string, unknown>[];
  runtimeEntropyEvolution: { at: string; entropy: number }[];
  loadSheddingHistory: AmplificationTimelineEntry[];
  stabilizationEquilibriumReport: Record<string, unknown>;
  recursionSuppressionReport: Record<string, unknown>;
  profile: AmplificationSuppressionProfile | null;
};
