import { STORAGE_KEYS } from '../../../src/constants/storageKeys';
import {
  APP_STATE_PERSISTENCE_VERSION,
  wrapAppStateForPersistence,
} from '../../../src/services/appStatePersistence';
import { wrapJournalWithIntegrity } from '../../../src/services/tamperDetection';
import type { AppState } from '../../../src/types';
import type { ExecutionJournalEntry } from '../../../src/types/execution';

export function buildValidAppStateBlob(state: AppState): string {
  return JSON.stringify(wrapAppStateForPersistence(state));
}

export function buildCorruptAppStateBlob(state: AppState): string {
  const envelope = wrapAppStateForPersistence(state);
  return JSON.stringify({ ...envelope, checksum: 'deadbeef' });
}

export function buildLegacyAppStateBlob(state: AppState): string {
  return JSON.stringify(state);
}

export function buildValidJournalBlob(entries: ExecutionJournalEntry[]): string {
  return JSON.stringify(wrapJournalWithIntegrity(entries));
}

export function buildCorruptJournalBlob(entries: ExecutionJournalEntry[]): string {
  const envelope = wrapJournalWithIntegrity(entries);
  return JSON.stringify({ ...envelope, integrityHash: '00000000' });
}

export const STORAGE_KEY_APP_STATE = STORAGE_KEYS.appState;
export const STORAGE_KEY_JOURNAL = STORAGE_KEYS.executionJournal;
export const STORAGE_KEY_BOOT_ATTEMPTS = '@sta/safe_boot_attempts_v1';

export { APP_STATE_PERSISTENCE_VERSION };
