import type { ProcessContinuityObserveInput } from '../../types/processContinuityRecovery';
import { noteProcessDeathEvent, noteProcessDeathRecovery, shouldTreatAsProcessDeath } from './processDeathContinuityManager';
import { commitRuntimeSnapshot } from './persistentRuntimeSnapshotCoordinator';
import { completeColdStart, resolveColdStartMode } from './coldStartRecoveryOrchestrator';
import { validateResurrection } from './runtimeResurrectionValidator';
import {
  beginHydrationRecovery,
  completeHydrationRecovery,
  computeStaleHydrationRisk,
} from './safeHydrationRecoveryFlow';
import { estimatePartialFields, repairPartialPersistence } from './partialPersistenceRepair';
import { verifySnapshotIntegrity } from './snapshotIntegrityVerifier';
import { appendPersistenceJournal, replayPersistenceJournal } from './crashSafePersistenceJournal';
import { runOrphanRuntimeCleanup, registerOrphanRuntime } from './orphanRuntimeCleanup';
import { detectZombiePersistence } from './zombiePersistenceDetector';
import {
  hasPartialExportBundle,
  noteInterruptedExport,
  recoverInterruptedExport,
} from './interruptedExportRecovery';
import { runPersistentReplayRecovery } from './persistentReplayRecovery';
import { validateSnapshotRollback } from './snapshotRollbackValidator';
import { detectLmkRecovery } from './lmkRecoveryDetector';
import { trackBackgroundReclaim } from './backgroundReclaimRecovery';
import {
  computePersistenceCorruptionRisk,
  quarantineCorruptSnapshot,
} from './persistenceCorruptionQuarantine';
import { computeCrashLoopRisk, shouldSuppressHeavyObservers } from './crashLoopSuppression';
import { recordResurrectionTimeline } from './processResurrectionTimeline';

export type ContinuityFlowResult = {
  flow: 'process_death' | 'lmk' | 'persistence_corruption' | 'interrupted_export' | 'crash_loop';
  recovered: boolean;
  detailJa: string;
};

export function runProcessDeathFlow(input: ProcessContinuityObserveInput): ContinuityFlowResult {
  if (!shouldTreatAsProcessDeath(input)) {
    return { flow: 'process_death', recovered: true, detailJa: 'continuity stable' };
  }
  noteProcessDeathEvent();
  appendPersistenceJournal('snapshot_validate');
  const integrity = verifySnapshotIntegrity(0);
  replayPersistenceJournal(8).forEach(() => appendPersistenceJournal('journal_replay'));
  runOrphanRuntimeCleanup();
  if (input.hydrationLockActive) beginHydrationRecovery();
  else completeHydrationRecovery();
  const replayOk = runPersistentReplayRecovery(integrity > 0.6) > 0.5;
  const resurrection = validateResurrection();
  const recovered = replayOk && resurrection > 0.55;
  noteProcessDeathRecovery(recovered);
  completeColdStart();
  return {
    flow: 'process_death',
    recovered,
    detailJa: recovered ? 'death → journal → orphan → hydration → replay restore' : 'process death recovery pending',
  };
}

export function runLmkFlow(input: ProcessContinuityObserveInput): ContinuityFlowResult {
  const lmk = detectLmkRecovery(input);
  if (!lmk) return { flow: 'lmk', recovered: true, detailJa: 'LMK idle' };
  appendPersistenceJournal('lmk_degraded_boot');
  return { flow: 'lmk', recovered: false, detailJa: 'LMK → degraded cold boot → minimal telemetry' };
}

export function runPersistenceCorruptionFlow(integrityScore: number): ContinuityFlowResult {
  if (integrityScore >= 0.72) {
    return { flow: 'persistence_corruption', recovered: true, detailJa: 'snapshot integrity ok' };
  }
  quarantineCorruptSnapshot(`snap-${Date.now()}`);
  const rollbackOk = validateSnapshotRollback();
  const repaired = repairPartialPersistence(estimatePartialFields(1 - integrityScore));
  runPersistentReplayRecovery(rollbackOk);
  return {
    flow: 'persistence_corruption',
    recovered: rollbackOk && repaired > 0,
    detailJa: `corrupt → quarantine → rollback → repair ${repaired}`,
  };
}

export function runInterruptedExportFlow(partialBytes: number, expectedBytes: number): ContinuityFlowResult {
  if (!hasPartialExportBundle(partialBytes, expectedBytes)) {
    return { flow: 'interrupted_export', recovered: true, detailJa: 'export complete' };
  }
  noteInterruptedExport();
  const ok = partialBytes / expectedBytes > 0.35;
  recoverInterruptedExport(ok);
  return {
    flow: 'interrupted_export',
    recovered: ok,
    detailJa: ok ? 'partial bundle → resumable restore' : 'export recovery failed',
  };
}

export function runCrashLoopFlow(input: ProcessContinuityObserveInput): ContinuityFlowResult {
  const risk = computeCrashLoopRisk(input.recoveryAttemptCount);
  if (risk < 0.5) return { flow: 'crash_loop', recovered: true, detailJa: 'no crash loop' };
  if (shouldSuppressHeavyObservers(risk)) {
    appendPersistenceJournal('crash_loop_minimal');
  }
  return {
    flow: 'crash_loop',
    recovered: risk < 0.95,
    detailJa: 'crash loop → safe boot path observe → staged restore',
  };
}

export function runProcessContinuityFlows(input: ProcessContinuityObserveInput): ContinuityFlowResult[] {
  const staleRisk = computeStaleHydrationRisk(input.hydrationLockActive, input.hydrationOverlapCount);
  const reclaim = trackBackgroundReclaim(input);
  if (reclaim) registerOrphanRuntime(`reclaim-${Date.now()}`);

  commitRuntimeSnapshot(`snap-${input.sessionMinutes}`, `h${input.jsHeapMb}-m${input.memoryTrendPct}`);
  const integrity = verifySnapshotIntegrity(staleRisk);
  detectZombiePersistence(staleRisk, 1 - integrity);

  const results = [
    runProcessDeathFlow(input),
    runLmkFlow(input),
    runPersistenceCorruptionFlow(integrity),
    runInterruptedExportFlow(integrity * 1000, 1000),
    runCrashLoopFlow(input),
  ];

  for (const r of results) {
    recordResurrectionTimeline(r.flow, r.detailJa);
  }

  resolveColdStartMode(input);
  return results;
}
