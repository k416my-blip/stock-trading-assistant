import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  COMPUTE_TIMELINE_MAX,
  REPLAY_MAX_ENTRIES,
  TRACE_MAX_BYTES,
} from '../constants/adaptiveResourceComputeBudget';
import type { ComputeTimelinePoint } from '../types/adaptiveResourceComputeBudget';

export type ResourceBudgetPersisted = {
  version: 1;
  computeTimeline: ComputeTimelinePoint[];
  lastSnapshotFingerprint: string | null;
  traceBytesEstimate: number;
  replayEntryCount: number;
  incrementalReplayHashes: string[];
  gcHintsIssued: number;
};

export function defaultResourceBudgetState(): ResourceBudgetPersisted {
  return {
    version: 1,
    computeTimeline: [],
    lastSnapshotFingerprint: null,
    traceBytesEstimate: 0,
    replayEntryCount: 0,
    incrementalReplayHashes: [],
    gcHintsIssued: 0,
  };
}

export async function loadResourceBudgetState(): Promise<ResourceBudgetPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.adaptiveResourceComputeBudget);
    if (!raw) return defaultResourceBudgetState();
    const parsed = JSON.parse(raw) as Partial<ResourceBudgetPersisted>;
    return {
      version: 1,
      computeTimeline: Array.isArray(parsed.computeTimeline)
        ? parsed.computeTimeline.slice(-COMPUTE_TIMELINE_MAX)
        : [],
      lastSnapshotFingerprint:
        typeof parsed.lastSnapshotFingerprint === 'string'
          ? parsed.lastSnapshotFingerprint
          : null,
      traceBytesEstimate:
        typeof parsed.traceBytesEstimate === 'number' ? parsed.traceBytesEstimate : 0,
      replayEntryCount:
        typeof parsed.replayEntryCount === 'number' ? parsed.replayEntryCount : 0,
      incrementalReplayHashes: Array.isArray(parsed.incrementalReplayHashes)
        ? parsed.incrementalReplayHashes.slice(-REPLAY_MAX_ENTRIES)
        : [],
      gcHintsIssued: typeof parsed.gcHintsIssued === 'number' ? parsed.gcHintsIssued : 0,
    };
  } catch {
    return defaultResourceBudgetState();
  }
}

export async function saveResourceBudgetState(state: ResourceBudgetPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.adaptiveResourceComputeBudget, JSON.stringify(state));
}

export async function appendComputeTimelinePoint(
  point: ComputeTimelinePoint,
): Promise<void> {
  const state = await loadResourceBudgetState();
  state.computeTimeline.push(point);
  state.computeTimeline = state.computeTimeline.slice(-COMPUTE_TIMELINE_MAX);
  await saveResourceBudgetState(state);
}

export function compressTracePayloadSize(jsonLength: number): {
  compressedLength: number;
  ratioPct: number;
  samplingActive: boolean;
} {
  if (jsonLength <= TRACE_MAX_BYTES) {
    return { compressedLength: jsonLength, ratioPct: 100, samplingActive: false };
  }
  const target = Math.round(TRACE_MAX_BYTES * 0.65);
  return {
    compressedLength: target,
    ratioPct: Math.round((target / jsonLength) * 100),
    samplingActive: true,
  };
}

export async function noteTraceAndReplaySizes(
  traceBytes: number,
  replayCount: number,
  replayHash: string,
): Promise<void> {
  const state = await loadResourceBudgetState();
  state.traceBytesEstimate = traceBytes;
  state.replayEntryCount = Math.min(replayCount, REPLAY_MAX_ENTRIES);
  if (!state.incrementalReplayHashes.includes(replayHash)) {
    state.incrementalReplayHashes.push(replayHash);
    state.incrementalReplayHashes = state.incrementalReplayHashes.slice(-REPLAY_MAX_ENTRIES);
  }
  await saveResourceBudgetState(state);
}

export async function dedupeSnapshotFingerprint(fingerprint: string): Promise<boolean> {
  const state = await loadResourceBudgetState();
  if (state.lastSnapshotFingerprint === fingerprint) return false;
  state.lastSnapshotFingerprint = fingerprint;
  await saveResourceBudgetState(state);
  return true;
}

export async function issueGarbageCollectionHint(): Promise<number> {
  const state = await loadResourceBudgetState();
  state.gcHintsIssued += 1;
  await saveResourceBudgetState(state);
  return state.gcHintsIssued;
}
