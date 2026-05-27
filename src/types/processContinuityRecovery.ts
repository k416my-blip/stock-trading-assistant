export type ProcessContinuityMode =
  | 'full'
  | 'cold_restore'
  | 'lmk_degraded'
  | 'corruption_quarantine'
  | 'crash_loop_minimal'
  | 'background_reclaim'
  | 'staged_hydration';

export type ProcessContinuityFlow =
  | 'process_death'
  | 'lmk'
  | 'persistence_corruption'
  | 'interrupted_export'
  | 'crash_loop';

export type ProcessContinuityTimelineEntry = {
  at: string;
  flow: ProcessContinuityFlow;
  detailJa: string;
};

export type ProcessContinuityProfile = {
  coldStartRecoveryMs: number;
  hydrationRecoveryMs: number;
  snapshotIntegrityScore: number;
  persistenceRepairCount: number;
  orphanCleanupCount: number;
  replayRecoverySuccess: number;
  crashLoopRisk: number;
  processDeathRecoveryRate: number;
  resurrectionConsistency: number;
  interruptedExportRecovery: number;
  continuityScore: number;
  persistenceCorruptionRisk: number;
  staleHydrationRisk: number;
  mode: ProcessContinuityMode;
  measuredAt: string;
};

export type ProcessContinuityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: ProcessContinuityProfile;
  timelineRecent: ProcessContinuityTimelineEntry[];
};

export type ProcessContinuityObserveInput = {
  eventLoopLagMs: number;
  jsHeapMb: number;
  memoryTrendPct: number;
  thermalState: string;
  appForeground: boolean;
  screenOff: boolean;
  batterySaver: boolean;
  miuiAggressiveReclaim: boolean;
  hydrationOverlapCount: number;
  hydrationLockActive: boolean;
  recoveryAttemptCount: number;
  asyncQueueDepth: number;
  sessionMinutes: number;
};

export type ProcessContinuityExportBundle = {
  version: string;
  exportedAt: string;
  timeline: ProcessContinuityTimelineEntry[];
  resurrectionJournal: Record<string, unknown>[];
  persistenceRepairLog: Record<string, unknown>[];
  crashRecoveryBundle: Record<string, unknown>;
  profile: ProcessContinuityProfile | null;
};
