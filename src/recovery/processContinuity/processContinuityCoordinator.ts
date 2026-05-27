/**
 * Process Death Continuity & Persistent Runtime Recovery — persistence/recovery paths only.
 * Assumes sudden process death; does not alter runtime policy or unified tick semantics.
 */
import type {
  ProcessContinuityDashboard,
  ProcessContinuityMode,
  ProcessContinuityObserveInput,
  ProcessContinuityProfile,
  ProcessContinuityTimelineEntry,
} from '../../types/processContinuityRecovery';
import {
  PROCESS_CONTINUITY_POLL_MS,
  PROCESS_CONTINUITY_UI_JA,
} from '../../constants/processContinuityRecovery';
import { resetProcessDeathContinuityManagerForTest } from './processDeathContinuityManager';
import {
  resetPersistentRuntimeSnapshotCoordinatorForTest,
  commitRuntimeSnapshot,
} from './persistentRuntimeSnapshotCoordinator';
import {
  beginColdStart,
  completeColdStart,
  getColdStartRecoveryMs,
  resetColdStartRecoveryOrchestratorForTest,
  resolveColdStartMode,
} from './coldStartRecoveryOrchestrator';
import { resetRuntimeResurrectionValidatorForTest, getResurrectionConsistency } from './runtimeResurrectionValidator';
import {
  resetSafeHydrationRecoveryFlowForTest,
  getHydrationRecoveryMs,
  computeStaleHydrationRisk,
  completeHydrationRecovery,
} from './safeHydrationRecoveryFlow';
import { resetPartialPersistenceRepairForTest, getPersistenceRepairCount } from './partialPersistenceRepair';
import { resetSnapshotIntegrityVerifierForTest, verifySnapshotIntegrity } from './snapshotIntegrityVerifier';
import {
  appendPersistenceJournal,
  replayPersistenceJournal,
  resetCrashSafePersistenceJournalForTest,
} from './crashSafePersistenceJournal';
import { resetOrphanRuntimeCleanupForTest, runOrphanRuntimeCleanup } from './orphanRuntimeCleanup';
import { resetZombiePersistenceDetectorForTest } from './zombiePersistenceDetector';
import { resetInterruptedExportRecoveryForTest, getInterruptedExportRecoveryRate } from './interruptedExportRecovery';
import { resetPersistentReplayRecoveryForTest, getReplayRecoverySuccess } from './persistentReplayRecovery';
import { resetSnapshotRollbackValidatorForTest } from './snapshotRollbackValidator';
import { attachContinuityScore } from './runtimeContinuityScoring';
import { resetLmkRecoveryDetectorForTest } from './lmkRecoveryDetector';
import {
  getProcessResurrectionTimeline,
  resetProcessResurrectionTimelineForTest,
} from './processResurrectionTimeline';
import { resetBackgroundReclaimRecoveryForTest } from './backgroundReclaimRecovery';
import {
  computePersistenceCorruptionRisk,
  getQuarantinedSnapshotCount,
  resetPersistenceCorruptionQuarantineForTest,
} from './persistenceCorruptionQuarantine';
import { computeCrashLoopRisk, resetCrashLoopSuppressionForTest } from './crashLoopSuppression';
import { resetMultiStageColdStartSurvivabilityForTest } from './multiStageColdStartSurvivability';
import { runProcessContinuityFlows } from './processContinuityOrchestrator';
import {
  recordProcessContinuitySoakEvent,
  resetProcessContinuitySoakIntegrationForTest,
  setProcessContinuitySoakHook,
} from './processContinuitySoakIntegration';
import { getProcessDeathRecoveryRate } from './processDeathContinuityManager';
import { readRecoveryAttemptCount } from '../../services/safeBoot';

const repairLog: Record<string, unknown>[] = [];

let lastProfile: ProcessContinuityProfile | null = null;
let lastThrottleAt = 0;
let coldStartPending = false;
let cachedRecoveryAttempts = 0;

export function resetProcessContinuityForTest(): void {
  lastProfile = null;
  lastThrottleAt = 0;
  coldStartPending = false;
  cachedRecoveryAttempts = 0;
  repairLog.length = 0;
  resetProcessDeathContinuityManagerForTest();
  resetPersistentRuntimeSnapshotCoordinatorForTest();
  resetColdStartRecoveryOrchestratorForTest();
  resetRuntimeResurrectionValidatorForTest();
  resetSafeHydrationRecoveryFlowForTest();
  resetPartialPersistenceRepairForTest();
  resetSnapshotIntegrityVerifierForTest();
  resetCrashSafePersistenceJournalForTest();
  resetOrphanRuntimeCleanupForTest();
  resetZombiePersistenceDetectorForTest();
  resetInterruptedExportRecoveryForTest();
  resetPersistentReplayRecoveryForTest();
  resetSnapshotRollbackValidatorForTest();
  resetLmkRecoveryDetectorForTest();
  resetProcessResurrectionTimelineForTest();
  resetBackgroundReclaimRecoveryForTest();
  resetPersistenceCorruptionQuarantineForTest();
  resetCrashLoopSuppressionForTest();
  resetMultiStageColdStartSurvivabilityForTest();
  resetProcessContinuitySoakIntegrationForTest();
}

export function initProcessContinuity(): void {
  if (coldStartPending) return;
  coldStartPending = true;
  beginColdStart();
  appendPersistenceJournal('cold_start_begin');
  commitRuntimeSnapshot('boot', 'boot-v1');
  void refreshRecoveryAttemptCache();
}

async function refreshRecoveryAttemptCache(): Promise<void> {
  cachedRecoveryAttempts = await readRecoveryAttemptCount();
}

export function setProcessContinuitySoakHookEnabled(enabled: boolean): void {
  setProcessContinuitySoakHook(enabled);
}

export function shouldRunProcessContinuitySample(_input: ProcessContinuityObserveInput, now = Date.now()): boolean {
  if (now - lastThrottleAt < PROCESS_CONTINUITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

function resolveMode(input: ProcessContinuityObserveInput, integrity: number): ProcessContinuityMode {
  const crashRisk = computeCrashLoopRisk(input.recoveryAttemptCount || cachedRecoveryAttempts);
  if (crashRisk >= 0.85) return 'crash_loop_minimal';
  if (integrity < 0.72) return 'corruption_quarantine';
  return resolveColdStartMode(input);
}

export function observeProcessContinuity(input: ProcessContinuityObserveInput): ProcessContinuityProfile {
  if (coldStartPending) {
    completeColdStart();
    coldStartPending = false;
  }

  const staleHydrationRisk = computeStaleHydrationRisk(
    input.hydrationLockActive,
    input.hydrationOverlapCount,
  );
  const flows = runProcessContinuityFlows({
    ...input,
    recoveryAttemptCount: input.recoveryAttemptCount || cachedRecoveryAttempts,
  });

  for (const entry of getProcessResurrectionTimeline().slice(-flows.length)) {
    recordProcessContinuitySoakEvent(entry);
  }

  const orphanCleanupCount = runOrphanRuntimeCleanup();
  const integrity = verifySnapshotIntegrity(staleHydrationRisk);
  const corruptionRisk = computePersistenceCorruptionRisk(integrity, getQuarantinedSnapshotCount());
  const mode = resolveMode(input, integrity);

  if (orphanCleanupCount > 0) {
    repairLog.push({ at: new Date().toISOString(), orphanCleanupCount });
  }

  const profile = attachContinuityScore({
    coldStartRecoveryMs: getColdStartRecoveryMs(),
    hydrationRecoveryMs: getHydrationRecoveryMs(),
    snapshotIntegrityScore: integrity,
    persistenceRepairCount: getPersistenceRepairCount(),
    orphanCleanupCount,
    replayRecoverySuccess: getReplayRecoverySuccess(),
    crashLoopRisk: computeCrashLoopRisk(input.recoveryAttemptCount || cachedRecoveryAttempts),
    processDeathRecoveryRate: getProcessDeathRecoveryRate(),
    resurrectionConsistency: getResurrectionConsistency(),
    interruptedExportRecovery: getInterruptedExportRecoveryRate(),
    persistenceCorruptionRisk: corruptionRisk,
    staleHydrationRisk,
    mode,
    measuredAt: new Date().toISOString(),
  });

  lastProfile = profile;
  return profile;
}

export function getLastProcessContinuityProfile(): ProcessContinuityProfile | null {
  return lastProfile;
}

export function getProcessContinuityTimeline(): ProcessContinuityTimelineEntry[] {
  return getProcessResurrectionTimeline();
}

export function getResurrectionJournal(): Record<string, unknown>[] {
  return replayPersistenceJournal(32).map((e) => ({ ...e }));
}

export function getPersistenceRepairLog(): Record<string, unknown>[] {
  return [...repairLog];
}

export function getProcessContinuityDashboard(): ProcessContinuityDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: PROCESS_CONTINUITY_UI_JA.sectionTitle,
    safetyBannerJa: PROCESS_CONTINUITY_UI_JA.safety,
    profile: lastProfile,
    timelineRecent: getProcessResurrectionTimeline().slice(-6),
  };
}

export async function refreshProcessContinuityBootSignals(): Promise<void> {
  await refreshRecoveryAttemptCache();
}
