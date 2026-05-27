import type { ProcessContinuityExportBundle } from '../../types/processContinuityRecovery';
import { PROCESS_CONTINUITY_VERSION } from '../../constants/processContinuityRecovery';
import {
  getLastProcessContinuityProfile,
  getProcessContinuityTimeline,
  getPersistenceRepairLog,
  getResurrectionJournal,
} from './processContinuityCoordinator';

export function buildContinuityTimelineExport(): ProcessContinuityExportBundle['timeline'] {
  return getProcessContinuityTimeline();
}

export function buildResurrectionJournalExport(): Record<string, unknown>[] {
  return getResurrectionJournal();
}

export function buildPersistenceRepairLogExport(): Record<string, unknown>[] {
  return getPersistenceRepairLog();
}

export function buildCrashRecoveryBundleExport(): Record<string, unknown> {
  return {
    version: PROCESS_CONTINUITY_VERSION,
    profile: getLastProcessContinuityProfile(),
    timeline: getProcessContinuityTimeline().slice(-24),
    repairLog: getPersistenceRepairLog().slice(-16),
  };
}

export function buildProcessContinuityExportBundle(): ProcessContinuityExportBundle {
  return {
    version: PROCESS_CONTINUITY_VERSION,
    exportedAt: new Date().toISOString(),
    timeline: buildContinuityTimelineExport(),
    resurrectionJournal: buildResurrectionJournalExport(),
    persistenceRepairLog: buildPersistenceRepairLogExport(),
    crashRecoveryBundle: buildCrashRecoveryBundleExport(),
    profile: getLastProcessContinuityProfile(),
  };
}

export function formatProcessContinuityExportJson(): string {
  return JSON.stringify(buildProcessContinuityExportBundle(), null, 2);
}
