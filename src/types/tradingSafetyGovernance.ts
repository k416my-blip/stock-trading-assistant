export type TradingSafetyFlow =
  | 'runtime_risk'
  | 'instability_degradation'
  | 'emergency_lightweight'
  | 'execution_pacing'
  | 'long_session_fatigue'
  | 'continuity_protection';

export type TradingSafetyMode =
  | 'full_safety'
  | 'paced_execution'
  | 'degraded_confidence'
  | 'emergency_lightweight_trading'
  | 'long_session_fatigue'
  | 'screen_off_lightweight'
  | 'reclaim_safe';

export type RiskEscalationLevel = 'none' | 'watch' | 'elevated' | 'severe' | 'critical';

export type TradingSafetyTimelineEntry = {
  at: string;
  flow: TradingSafetyFlow;
  detailJa: string;
};

export type ConfidenceEvolutionPoint = {
  at: string;
  confidence: number;
  weighted: number;
};

export type TradingSafetyProfile = {
  runtimeTradingRisk: number;
  survivabilityWeightedConfidence: number;
  runtimeInstabilityRisk: number;
  websocketTradingRisk: number;
  executionPacingRisk: number;
  runtimeRecommendationConfidence: number;
  thermalTradingPressure: number;
  observerOverheadTradingRisk: number;
  tradingContinuityRisk: number;
  runtimeStressConfidence: number;
  longSessionTradingFatigue: number;
  emergencyTradingRisk: number;
  riskEscalationLevel: RiskEscalationLevel;
  tradingSafetyEquilibrium: number;
  runtimeTradingSuppression: number;
  mode: TradingSafetyMode;
  measuredAt: string;
};

export type TradingSafetyDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: TradingSafetyProfile;
  riskEvolution: { at: string; risk: number }[];
  confidenceTimeline: ConfidenceEvolutionPoint[];
  executionPacingFlow: string[];
  suppressionMap: Record<string, boolean>;
  weightedConfidenceGraph: ConfidenceEvolutionPoint[];
  timelineRecent: TradingSafetyTimelineEntry[];
};

export type TradingSafetyObserveInput = {
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
  governanceConfidence: number;
  runtimeSafeTradingScore: number;
  survivabilityTradingMode: string;
  observerOverheadRatio: number;
  equilibriumScore: number;
  metaCoordinationStability: number;
  staleHydrationRisk: number;
  causalConfidence: number;
};

export type TradingSafetyExportBundle = {
  version: string;
  exportedAt: string;
  tradingSafetyTimeline: TradingSafetyTimelineEntry[];
  runtimeConfidenceEvolution: ConfidenceEvolutionPoint[];
  executionPacingReport: Record<string, unknown>;
  survivabilityWeightedRiskReport: Record<string, unknown>;
  runtimeSuppressionHistory: Record<string, unknown>[];
  tradingEquilibriumEvolution: { at: string; score: number }[];
  profile: TradingSafetyProfile | null;
};
