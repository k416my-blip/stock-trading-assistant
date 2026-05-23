export const FAILURE_RECOVERY_STATES = [
  'healthy',
  'degraded',
  'recovery',
  'quarantine',
  'emergency',
  'freeze_safe',
  'thermal_safe',
  'background_survival',
  'bridge_recovery',
  'memory_recovery',
] as const;

export type FailureRecoveryState = (typeof FAILURE_RECOVERY_STATES)[number];

export type FailureRecoveryTimelineEntry = {
  at: string;
  from: FailureRecoveryState;
  to: FailureRecoveryState;
  flow: 'freeze' | 'bridge' | 'thermal' | 'background' | 'memory' | 'network' | 'idle' | 'quarantine';
  detailJa: string;
};

export type FailureRecoveryProfile = {
  recoverySuccessRate: number;
  recoveryEscalationLevel: number;
  bridgeRecoveryCount: number;
  freezeRecoveryLatency: number;
  thermalRecoveryTime: number;
  backgroundRecoveryMs: number;
  memoryCompactionEfficiency: number;
  staleSubscriptionCount: number;
  websocketRecoveryRate: number;
  networkChaosScore: number;
  runtimeQuarantineDuration: number;
  degradationState: FailureRecoveryState;
  selfHealingEfficiency: number;
  continuousRecoveryScore: number;
  measuredAt: string;
};

export type FailureRecoveryDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: FailureRecoveryProfile;
  timelineRecent: FailureRecoveryTimelineEntry[];
};

export type FailureRecoveryObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  renderBurstRate: number;
  jsHeapMb: number;
  memoryTrendPct: number;
  thermalState: string;
  appForeground: boolean;
  screenOff: boolean;
  batterySaver: boolean;
  asyncQueueDepth: number;
  reconnectPerMin: number;
  wsDuplicateCount: number;
  heartbeatAgeMs: number;
  bridgeTrafficRate: number;
  renderStormRisk: number;
  miuiAggressiveReclaim: boolean;
};

export type FailureRecoveryExportBundle = {
  version: string;
  exportedAt: string;
  timeline: FailureRecoveryTimelineEntry[];
  quarantineSnapshot: Record<string, unknown>;
  degradationTransitions: FailureRecoveryTimelineEntry[];
  recoveryHeatmap: Record<string, number>;
  profile: FailureRecoveryProfile | null;
};
