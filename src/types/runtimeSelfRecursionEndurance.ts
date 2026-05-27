export type SelfRecursionEnduranceFlow =
  | 'self_recursion_circuit_flow'
  | 'observer_audit_loop'
  | 'telemetry_echo_loop'
  | 'recursive_governance_feedback'
  | 'dashboard_payload_growth'
  | 'long_session_drift'
  | 'miui_background_starvation'
  | 'battery_saver_observer_delay'
  | 'narrative_recursion_amplification'
  | 'operational_endurance_evolution';

export type EnduranceRiskBand = 'low' | 'medium' | 'high';

export type SuppressionSuggestionRecord = {
  at: string;
  target: string;
  suppressionSuggestion: string;
  observeOnly: true;
};

export type SelfRecursionEnduranceTimelineEntry = {
  at: string;
  flow: SelfRecursionEnduranceFlow;
  detailJa: string;
};

export type RuntimeSelfRecursionEnduranceProfile = {
  recursionDepth: number;
  recursionCircuitRisk: number;
  observerEchoRisk: number;
  telemetryEchoRisk: number;
  auditLoopRisk: number;
  runtimeOperationalEnduranceScore: number;
  dashboardPayloadGrowthRisk: number;
  longSessionDriftRisk: number;
  runtimeEnduranceConfidence: number;
  enduranceRiskBand: EnduranceRiskBand;
  miuiBackgroundStarvationRisk: number;
  batterySaverObserverDelayRisk: number;
  measuredAt: string;
};

export type RuntimeSelfRecursionEnduranceDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeSelfRecursionEnduranceProfile;
  circuitTimeline: { at: string; recursionCircuitRisk: number }[];
  suppressionSuggestions: SuppressionSuggestionRecord[];
  enduranceRiskBand: EnduranceRiskBand;
  timelineRecent: SelfRecursionEnduranceTimelineEntry[];
};

export type RuntimeSelfRecursionEnduranceObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  jsHeapMb: number;
  memoryTrendPct: number;
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
  dashboardRowCount: number;
  telemetrySampleCount: number;
  narrativeRecursionScore: number;
  batterySaver: boolean;
  appForeground: boolean;
  screenOff: boolean;
  miuiAggressiveReclaim: boolean;
  thermalState: string;
};

export type RuntimeSelfRecursionEnduranceExportBundle = {
  version: string;
  exportedAt: string;
  circuitBreakerReport: Record<string, unknown>;
  recursionCircuitReport: Record<string, unknown>;
  operationalEnduranceReport: Record<string, unknown>;
  miuiEnduranceReport: Record<string, unknown>;
  suppressionSuggestions: SuppressionSuggestionRecord[];
  profile: RuntimeSelfRecursionEnduranceProfile | null;
};
