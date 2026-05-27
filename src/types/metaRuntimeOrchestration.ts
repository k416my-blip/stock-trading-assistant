export type MetaOrchestrationFlow =
  | 'conflict_arbitration'
  | 'oscillation_suppression'
  | 'telemetry_amplification_protection'
  | 'runtime_equilibrium'
  | 'long_session_fatigue'
  | 'cross_layer_pacing';

export type SurvivabilityLayerId =
  | 'recovery'
  | 'continuity'
  | 'governance'
  | 'telemetry'
  | 'causal'
  | 'trading'
  | 'rn_bridge'
  | 'js_stabilization';

export type MetaInteractionNode = {
  id: SurvivabilityLayerId;
  label: string;
  pressure: number;
};

export type MetaInteractionEdge = {
  from: SurvivabilityLayerId;
  to: SurvivabilityLayerId;
  contention: number;
};

export type MetaInteractionGraph = {
  nodes: MetaInteractionNode[];
  edges: MetaInteractionEdge[];
  measuredAt: string;
};

export type MetaOrchestrationTimelineEntry = {
  at: string;
  flow: MetaOrchestrationFlow;
  detailJa: string;
};

export type MetaOrchestrationProfile = {
  survivabilityConflictScore: number;
  orchestrationPressure: number;
  interventionDensity: number;
  governanceThrashRisk: number;
  recoveryOscillationRisk: number;
  telemetryAmplificationScore: number;
  observerStarvationRisk: number;
  stabilizationDeadlockRisk: number;
  survivabilityContention: number;
  runtimeFatigueScore: number;
  orchestrationBalance: number;
  interventionCooldownEfficiency: number;
  equilibriumScore: number;
  crossLayerPressure: number;
  metaCoordinationStability: number;
  measuredAt: string;
};

export type MetaOrchestrationDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: MetaOrchestrationProfile;
  interactionGraph: MetaInteractionGraph;
  contentionMap: MetaInteractionEdge[];
  pacingTimeline: MetaOrchestrationTimelineEntry[];
  interventionHeatmap: Record<string, number>;
  timelineRecent: MetaOrchestrationTimelineEntry[];
};

export type MetaOrchestrationObserveInput = {
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
  recoverySuccessRate: number;
  continuityScore: number;
  jsSurvivalScore: number;
  governanceConfidence: number;
  governanceMode: string;
  observerOverheadRatio: number;
  runtimeSafeTradingScore: number;
  causalConfidence: number;
  rootCauseScore: number;
  schedulerDriftMs: number;
  staleHydrationRisk: number;
};

export type MetaOrchestrationExportBundle = {
  version: string;
  exportedAt: string;
  orchestrationTimeline: MetaOrchestrationTimelineEntry[];
  survivabilityConflictReport: Record<string, unknown>;
  equilibriumEvolution: { at: string; score: number }[];
  pacingGraph: MetaInteractionGraph;
  interventionHeatmap: Record<string, number>;
  runtimeFatigueEvolution: { at: string; score: number }[];
  profile: MetaOrchestrationProfile | null;
};
