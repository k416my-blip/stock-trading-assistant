import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  CHECKPOINT_MAX_COUNT,
  REPLAY_CHECKPOINT_MAX,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_MAX_COUNT,
} from '../constants/stateIntegrityTemporalConsistency';
import type { ReplayCheckpoint, StateSnapshotRecord } from '../types/stateIntegrityTemporalConsistency';

export type TemporalConsistencyPersisted = {
  version: 1;
  globalStateVersion: number;
  snapshots: StateSnapshotRecord[];
  checkpoints: ReplayCheckpoint[];
  lastReplayIntegrityHash: string | null;
  lastGovernanceVersion: number | null;
  contradictionAuditCount: number;
};

export function defaultTemporalConsistencyState(): TemporalConsistencyPersisted {
  return {
    version: 1,
    globalStateVersion: 0,
    snapshots: [],
    checkpoints: [],
    lastReplayIntegrityHash: null,
    lastGovernanceVersion: null,
    contradictionAuditCount: 0,
  };
}

export async function loadTemporalConsistencyState(): Promise<TemporalConsistencyPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.stateIntegrityTemporalConsistency);
    if (!raw) return defaultTemporalConsistencyState();
    const parsed = JSON.parse(raw) as Partial<TemporalConsistencyPersisted>;
    return {
      version: 1,
      globalStateVersion:
        typeof parsed.globalStateVersion === 'number' ? parsed.globalStateVersion : 0,
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots.slice(-SNAPSHOT_MAX_COUNT) : [],
      checkpoints: Array.isArray(parsed.checkpoints)
        ? parsed.checkpoints.slice(-CHECKPOINT_MAX_COUNT)
        : [],
      lastReplayIntegrityHash:
        typeof parsed.lastReplayIntegrityHash === 'string'
          ? parsed.lastReplayIntegrityHash
          : null,
      lastGovernanceVersion:
        typeof parsed.lastGovernanceVersion === 'number' ? parsed.lastGovernanceVersion : null,
      contradictionAuditCount:
        typeof parsed.contradictionAuditCount === 'number' ? parsed.contradictionAuditCount : 0,
    };
  } catch {
    return defaultTemporalConsistencyState();
  }
}

export async function saveTemporalConsistencyState(
  state: TemporalConsistencyPersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.stateIntegrityTemporalConsistency,
    JSON.stringify(state),
  );
}

export function hashIntegrityPayload(parts: string[]): string {
  return parts.join('|').slice(0, 120);
}

export function compressSnapshotPayload(json: string): number {
  if (json.length <= SNAPSHOT_MAX_BYTES) return json.length;
  return Math.round(SNAPSHOT_MAX_BYTES * 0.7);
}

export async function appendImmutableSnapshot(
  record: StateSnapshotRecord,
): Promise<TemporalConsistencyPersisted> {
  const state = await loadTemporalConsistencyState();
  state.globalStateVersion += 1;
  state.snapshots.push(record);
  state.snapshots = state.snapshots.slice(-SNAPSHOT_MAX_COUNT);
  await saveTemporalConsistencyState(state);
  return state;
}

export async function appendReplayCheckpoint(cp: ReplayCheckpoint): Promise<void> {
  const state = await loadTemporalConsistencyState();
  state.checkpoints.push(cp);
  state.checkpoints = state.checkpoints.slice(-REPLAY_CHECKPOINT_MAX);
  state.lastReplayIntegrityHash = cp.integrityHash;
  await saveTemporalConsistencyState(state);
}
