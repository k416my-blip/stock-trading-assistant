import { PROCESS_CONTINUITY_JOURNAL_MAX } from '../../constants/processContinuityRecovery';

type JournalEntry = { at: string; op: string; tombstone?: string };

const journal: JournalEntry[] = [];

export function resetCrashSafePersistenceJournalForTest(): void {
  journal.length = 0;
}

export function appendPersistenceJournal(op: string, tombstone?: string): void {
  journal.push({ at: new Date().toISOString(), op, tombstone });
  if (journal.length > PROCESS_CONTINUITY_JOURNAL_MAX) journal.shift();
}

export function replayPersistenceJournal(limit = 32): JournalEntry[] {
  return journal.slice(-limit);
}

export function getJournalLength(): number {
  return journal.length;
}
