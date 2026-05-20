import type { AppState } from '../types';
import {
  computePortfolioChecksum,
  isPortfolioStructurallyCorrupt,
} from './portfolioSnapshot';
import { countActiveHoldings } from './portfolioPersistenceGuard';

export const APP_STATE_PERSISTENCE_VERSION = 3 as const;

export type PersistedAppStateEnvelope = {
  version: typeof APP_STATE_PERSISTENCE_VERSION;
  savedAt: string;
  checksum: string;
  state: AppState;
};

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** 永続化整合性チェックサム（保有リスト中心） */
export function computeAppStateIntegrityChecksum(state: AppState): string {
  const payload = JSON.stringify({
    manual: computePortfolioChecksum(state.portfolio),
    practice: computePortfolioChecksum(state.practice.portfolio),
    manualActive: countActiveHoldings(state.portfolio),
    practiceActive: countActiveHoldings(state.practice.portfolio),
  });
  return djb2Hash(payload);
}

export function wrapAppStateForPersistence(state: AppState): PersistedAppStateEnvelope {
  return {
    version: APP_STATE_PERSISTENCE_VERSION,
    savedAt: new Date().toISOString(),
    checksum: computeAppStateIntegrityChecksum(state),
    state,
  };
}

export function verifyPersistedAppStateChecksum(
  envelope: PersistedAppStateEnvelope,
): boolean {
  if (!envelope.checksum) return false;
  return computeAppStateIntegrityChecksum(envelope.state) === envelope.checksum;
}

export function isPersistedAppStateCorrupt(state: AppState): boolean {
  const manualBad =
    countActiveHoldings(state.portfolio) > 0 &&
    isPortfolioStructurallyCorrupt(state.portfolio);
  const practiceBad =
    countActiveHoldings(state.practice.portfolio) > 0 &&
    isPortfolioStructurallyCorrupt(state.practice.portfolio);
  return manualBad || practiceBad;
}

export function isPersistedAppStateEnvelope(
  value: unknown,
): value is PersistedAppStateEnvelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.version === APP_STATE_PERSISTENCE_VERSION && v.state != null && typeof v.checksum === 'string';
}
