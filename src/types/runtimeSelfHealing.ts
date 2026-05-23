import type { DriftPhase } from './adaptiveRuntimeGovernance';

export const SELF_HEALING_PHASES = [
  'HEALTHY',
  'RECOVERING',
  'SELF_HEALING',
  'EMERGENCY_RECOVERY',
] as const;

export type SelfHealingPhase = (typeof SELF_HEALING_PHASES)[number];

export type SelfHealingSignals = {
  heapGrowthVelocityPct: number;
  queueStagnationMs: number;
  reconnectLoopCount: number;
  observerAccumulation: number;
  timerDriftMs: number;
  journalEventCount: number;
  hydrationResidueCount: number;
  adaptiveEdgeCount: number;
  thermalPressurePct: number;
  appForeground: boolean;
};

export type MemoryReclamationResult = {
  reclaimedBytesEstimate: number;
  staleCachesPurged: number;
  snapshotsThinned: number;
  journalCompacted: number;
  reconnectHistoryTrimmed: number;
  adaptiveEdgesPruned: number;
  graphCompactionRatio: number;
};

export type ZombieCleanupResult = {
  orphanAsyncAborted: number;
  queuePurged: number;
  timersCancelled: number;
  orchestrationAbandoned: number;
  hydrationTasksCleared: number;
  websocketWorkersReset: number;
};

export type TimerDriftCorrectionResult = {
  timerDriftMs: number;
  driftRecoveryScore: number;
  intervalsDeduped: number;
  heartbeatSkewCorrected: boolean;
};

export type AdaptiveGraphCompactionResult = {
  edgesBefore: number;
  edgesAfter: number;
  transitionsPruned: number;
  latentPathsMerged: number;
  compactionRatio: number;
  protectedPreserved: number;
};

export type WebSocketZombieRecoveryResult = {
  ghostStateCleared: boolean;
  hardResetPerformed: boolean;
  transportRebuild: boolean;
  cooldownAppliedMs: number;
  offlineDebounceMs: number;
};

export type ObserverLeakPreventionResult = {
  duplicateSubscriptionsRemoved: number;
  staleListenersDetached: number;
  dashboardObserversCapped: number;
  hydrationListenersPruned: number;
};

export type ThermalRecoveryState = {
  thermalPressurePct: number;
  deepAnalysisFrozen: boolean;
  dashboardCompact: boolean;
  websocketLowFrequency: boolean;
  adaptiveLearningPaused: boolean;
  renderSuppressed: boolean;
  stagedRecoveryActive: boolean;
};

export type LongSessionMaintenanceResult = {
  windowMinutes: 30 | 60 | 120 | 180;
  actionsJa: string[];
  replayCompacted: boolean;
  observerPruned: boolean;
  adaptiveThinned: boolean;
  queueRebalanced: boolean;
  selfRestartPhase: boolean;
};

export type SelfHealingActionRecord = {
  at: string;
  phase: SelfHealingPhase;
  actionJa: string;
  reclaimedBytes?: number;
};

export type RecoveryDashboard = {
  heapStabilizationScore: number;
  reclaimedMemoryKb: number;
  zombieCleanupCount: number;
  timerDriftMs: number;
  driftRecoveryScore: number;
  reconnectRebuildCount: number;
  observerLeakPrevented: number;
  thermalRecovery: ThermalRecoveryState;
  adaptiveGraphCompactionPct: number;
  phase: SelfHealingPhase;
  recentActions: SelfHealingActionRecord[];
};

export type RuntimeSelfHealingBundle = {
  version: string;
  builtAt: string;
  phase: SelfHealingPhase;
  signals: SelfHealingSignals;
  memoryReclamation: MemoryReclamationResult;
  zombieCleanup: ZombieCleanupResult;
  timerDrift: TimerDriftCorrectionResult;
  graphCompaction: AdaptiveGraphCompactionResult;
  websocketRecovery: WebSocketZombieRecoveryResult;
  observerPrevention: ObserverLeakPreventionResult;
  thermalRecovery: ThermalRecoveryState;
  longSessionMaintenance: LongSessionMaintenanceResult[];
  dashboard: RecoveryDashboard;
  driftPhase: DriftPhase | 'unknown';
};

export type RedmiSelfHealingReport = {
  deviceModel: string;
  jsHeapStabilization: number;
  memoryReclamationEfficiency: number;
  zombieRecoverySuccessRate: number;
  websocketRebuildReliability: number;
  timerDriftSuppression: number;
  thermalSurvivability: number;
  longSessionDegradationSuppression: number;
  selfHealingOverheadPct: number;
  batteryImpactScore: number;
  threeHourStabilityScore: number;
  summaryJa: string;
};
