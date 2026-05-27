export type ObserverRecursionFlow =
  | 'observer_recursion_flow'
  | 'recursive_observer_cascade'
  | 'telemetry_echo_inflation'
  | 'circular_governance_amplification'
  | 'observer_dependency_lock'
  | 'long_session_recursive_drift'
  | 'cross_layer_observe_consistency'
  | 'observe_graph_complexity'
  | 'signal_echo_loops'
  | 'observer_recursion_evolution';

export type ObserverGraphNode = { id: string; label: string; score: number };
export type ObserverGraphEdge = { from: string; to: string; weight: number };

export type ObserverGraphSnapshot = {
  nodes: ObserverGraphNode[];
  edges: ObserverGraphEdge[];
  measuredAt: string;
};

export type ObserverRecursionTimelineEntry = {
  at: string;
  flow: ObserverRecursionFlow;
  detailJa: string;
};

export type RuntimeObserverRecursionProfile = {
  observerRecursionRisk: number;
  telemetryAmplificationRisk: number;
  recursiveSignalEchoRisk: number;
  observeGraphComplexity: number;
  runtimeObserverConfidence: number;
  recursionDepthScore: number;
  circularGraphScore: number;
  governanceEchoScore: number;
  measuredAt: string;
};

export type RuntimeObserverRecursionDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeObserverRecursionProfile;
  recursionEvolution: { at: string; score: number }[];
  recursionHeatmap: { layer: string; intensity: number }[];
  observeGraph: ObserverGraphSnapshot;
  dependencyGraph: ObserverGraphSnapshot;
  amplificationTimeline: { at: string; level: number }[];
  timelineRecent: ObserverRecursionTimelineEntry[];
};

export type RuntimeObserverRecursionObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  jsHeapMb: number;
  sessionMinutes: number;
  observerOverheadRatio: number;
  governanceConfidence: number;
  governanceMode: string;
  telemetryAmplificationScore: number;
  runtimeAmplificationRisk: number;
  observerDensityScore: number;
  runtimeAuditCoverage: number;
  orchestrationEdgeCount: number;
  interventionDensity: number;
  metaRecursionRisk: number;
  bridgeTrafficRate: number;
  reconnectPerMin: number;
  runtimeTradingSuppression: number;
};

export type RuntimeObserverRecursionExportBundle = {
  version: string;
  exportedAt: string;
  observerRecursionReport: Record<string, unknown>;
  recursionAnalysis: Record<string, unknown>;
  telemetryEchoReport: Record<string, unknown>;
  observeGraphExport: Record<string, unknown>;
  dependencyGraphExport: Record<string, unknown>;
  amplificationHeatmap: Record<string, unknown>;
  profile: RuntimeObserverRecursionProfile | null;
};
