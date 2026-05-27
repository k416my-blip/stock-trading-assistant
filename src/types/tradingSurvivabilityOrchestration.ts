export type SurvivabilityTradingMode =
  | 'full_trading'
  | 'paced_polling'
  | 'thermal_lightweight'
  | 'low_memory_core'
  | 'emergency_lightweight'
  | 'long_session_survivability'
  | 'screen_off_minimal'
  | 'reclaim_adapted_trading'
  | 'bridge_paced_concierge';

export type TradingSurvivabilityFlow =
  | 'trading_runtime'
  | 'ai_concierge_pacing'
  | 'thermal_trading'
  | 'low_memory_trading'
  | 'emergency_lightweight'
  | 'long_session_survivability';

export type TradingSurvivabilityTimelineEntry = {
  at: string;
  flow: TradingSurvivabilityFlow;
  detailJa: string;
};

export type TradingSurvivabilityProfile = {
  tradingRuntimeHealth: number;
  aiConciergePressure: number;
  marketPollingCost: number;
  websocketPressure: number;
  portfolioRefreshCost: number;
  runtimeSafeTradingScore: number;
  aiLatencyBalance: number;
  heavyAnalysisPressure: number;
  notificationPressure: number;
  runtimeTradingFatigue: number;
  survivabilityTradingMode: SurvivabilityTradingMode;
  bridgeTradingOverhead: number;
  runtimeExecutionSafety: number;
  tradingHydrationStability: number;
  emergencyLightweightScore: number;
  measuredAt: string;
};

export type TradingSurvivabilityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: TradingSurvivabilityProfile;
  timelineRecent: TradingSurvivabilityTimelineEntry[];
};

export type TradingSurvivabilityObserveInput = {
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
  runtimeFatigue: number;
  staleHydrationRisk: number;
};

export type TradingSurvivabilityExportBundle = {
  version: string;
  exportedAt: string;
  survivabilityTimeline: TradingSurvivabilityTimelineEntry[];
  aiPacingTransitions: TradingSurvivabilityTimelineEntry[];
  lightweightModeTransitions: TradingSurvivabilityTimelineEntry[];
  pollingHistory: { at: string; cost: number; mode: SurvivabilityTradingMode }[];
  conciergeSuppressionReport: Record<string, unknown>[];
  profile: TradingSurvivabilityProfile | null;
};
