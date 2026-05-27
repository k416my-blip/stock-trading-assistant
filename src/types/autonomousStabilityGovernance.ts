export type AutonomousGovernanceMode =
  | 'full_observe'
  | 'thermal_paced'
  | 'observer_balanced'
  | 'recovery_paced'
  | 'long_session_metabolism'
  | 'screen_off_minimal'
  | 'reclaim_adapted';

export type AutonomousGovernanceFlow =
  | 'adaptation'
  | 'observer_balance'
  | 'thermal'
  | 'long_session'
  | 'hysteresis';

export type AutonomousGovernanceTimelineEntry = {
  at: string;
  flow: AutonomousGovernanceFlow;
  detailJa: string;
};

export type AutonomousGovernanceProfile = {
  governanceConfidence: number;
  runtimeFatigue: number;
  observerOverheadRatio: number;
  recoveryEfficiency: number;
  degradationEfficiency: number;
  thermalGovernanceScore: number;
  adaptationStability: number;
  energyPerRecovery: number;
  survivabilityTrend: number;
  runtimeMetabolism: number;
  governanceTransitionCost: number;
  adaptationConsistency: number;
  starvationRiskTrend: number;
  suppressionEfficiency: number;
  longSessionAdaptationScore: number;
  mode: AutonomousGovernanceMode;
  measuredAt: string;
};

export type AutonomousGovernanceDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: AutonomousGovernanceProfile;
  timelineRecent: AutonomousGovernanceTimelineEntry[];
};

export type AutonomousGovernanceObserveInput = {
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
  recoverySuccessRate: number;
  continuityScore: number;
  jsSurvivalScore: number;
  schedulerDriftMs: number;
  staleHydrationRisk: number;
};

export type AutonomousGovernanceExportBundle = {
  version: string;
  exportedAt: string;
  timeline: AutonomousGovernanceTimelineEntry[];
  adaptationTransitions: AutonomousGovernanceTimelineEntry[];
  observerSuppressionLog: Record<string, unknown>[];
  recoveryEffectivenessReport: Record<string, unknown>;
  survivabilityEvolutionTimeline: { at: string; score: number }[];
  profile: AutonomousGovernanceProfile | null;
};
