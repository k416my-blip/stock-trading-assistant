export type CausalIntelligenceFlow =
  | 'causal_reconstruction'
  | 'failure_attribution'
  | 'recovery_attribution'
  | 'cascade_analysis'
  | 'long_session_drift';

export type CausalGraphNodeKind =
  | 'thermal'
  | 'bridge'
  | 'websocket'
  | 'render'
  | 'observer'
  | 'governance'
  | 'recovery'
  | 'reclaim'
  | 'trading'
  | 'hydration';

export type CausalGraphNode = {
  id: string;
  kind: CausalGraphNodeKind;
  label: string;
  weight: number;
};

export type CausalGraphEdge = {
  from: string;
  to: string;
  weight: number;
  correlationMs: number;
};

export type CausalGraphSnapshot = {
  nodes: CausalGraphNode[];
  edges: CausalGraphEdge[];
  measuredAt: string;
};

export type CausalTimelineEntry = {
  at: string;
  flow: CausalIntelligenceFlow;
  detailJa: string;
};

export type CausalIntelligenceProfile = {
  causalConfidence: number;
  rootCauseScore: number;
  propagationDepth: number;
  cascadeSeverity: number;
  recoveryAttribution: number;
  thermalCausalityScore: number;
  bridgeCausalityScore: number;
  websocketInstabilityScore: number;
  observerInteractionCost: number;
  governanceAttribution: number;
  runtimeCorrelationStrength: number;
  anomalyClusterScore: number;
  replayConsistency: number;
  causalDrift: number;
  survivabilityCausalScore: number;
  measuredAt: string;
};

export type CausalIntelligenceDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: CausalIntelligenceProfile;
  graph: CausalGraphSnapshot;
  recentChain: string[];
  recoveryPath: string[];
  propagationFlow: string[];
  timelineRecent: CausalTimelineEntry[];
};

export type CausalIntelligenceObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  renderBurstRate: number;
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
  governanceConfidence: number;
  governanceMode: string;
  runtimeSafeTradingScore: number;
  survivabilityTradingMode: string;
  observerOverheadRatio: number;
  schedulerDriftMs: number;
  staleHydrationRisk: number;
};

export type CausalIntelligenceExportBundle = {
  version: string;
  exportedAt: string;
  causalTimeline: CausalTimelineEntry[];
  incidentGraph: CausalGraphSnapshot;
  recoveryAttributionReport: Record<string, unknown>;
  degradationPropagationMap: CausalGraphEdge[];
  survivabilityCausalityEvolution: { at: string; score: number }[];
  profile: CausalIntelligenceProfile | null;
};
