export const PROCESS_CONTINUITY_VERSION = '1.0.0';

export const PROCESS_CONTINUITY_POLL_MS = 20_000;
export const PROCESS_CONTINUITY_TIMELINE_MAX = 400;
export const PROCESS_CONTINUITY_JOURNAL_MAX = 128;
export const PROCESS_CONTINUITY_CRASH_LOOP_ATTEMPTS = 3;
export const PROCESS_CONTINUITY_INTEGRITY_WARN = 0.55;
export const PROCESS_CONTINUITY_HYDRATION_OVERLAP_WARN = 2;
export const PROCESS_CONTINUITY_COLD_START_MS = 12_000;

export const PROCESS_CONTINUITY_UI_JA = {
  sectionTitle: 'Process Continuity',
  safety:
    '監視・永続化・復旧のみ — runtime policy / unified tick / telemetry 意味は変更しません',
  continuityScore: 'continuityScore',
  processDeathRecovery: 'processDeathRecoveryRate',
  hydrationRecovery: 'hydrationRecoveryMs',
  snapshotIntegrity: 'snapshotIntegrity',
  replayRecovery: 'replayRecovery',
  crashLoopRisk: 'crashLoopRisk',
  orphanCleanup: 'orphanCleanup',
  persistenceRepair: 'persistenceRepair',
  resurrectionConsistency: 'resurrectionConsistency',
  timeline: 'continuity timeline',
} as const;
