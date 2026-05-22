import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  COMPRESSED_TIMELINE_MAX,
  META_SNAPSHOT_MAX,
} from '../constants/recursiveMemoryCompressionStrategicAbstraction';
import type {
  CompressedTimelineChunk,
  MetaStateSnapshot,
} from '../types/recursiveMemoryCompressionStrategicAbstraction';

export type MemoryCompressionPersisted = {
  version: 1;
  compressedTimeline: CompressedTimelineChunk[];
  metaSnapshots: MetaStateSnapshot[];
  rawBytesEstimate: number;
  compressedBytesEstimate: number;
};

export function defaultMemoryCompressionState(): MemoryCompressionPersisted {
  return {
    version: 1,
    compressedTimeline: [],
    metaSnapshots: [],
    rawBytesEstimate: 0,
    compressedBytesEstimate: 0,
  };
}

export async function loadMemoryCompressionState(): Promise<MemoryCompressionPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.recursiveMemoryCompressionStrategicAbstraction);
    if (!raw) return defaultMemoryCompressionState();
    const parsed = JSON.parse(raw) as Partial<MemoryCompressionPersisted>;
    return {
      version: 1,
      compressedTimeline: Array.isArray(parsed.compressedTimeline)
        ? parsed.compressedTimeline.slice(-COMPRESSED_TIMELINE_MAX)
        : [],
      metaSnapshots: Array.isArray(parsed.metaSnapshots)
        ? parsed.metaSnapshots.slice(-META_SNAPSHOT_MAX)
        : [],
      rawBytesEstimate:
        typeof parsed.rawBytesEstimate === 'number' ? parsed.rawBytesEstimate : 0,
      compressedBytesEstimate:
        typeof parsed.compressedBytesEstimate === 'number' ? parsed.compressedBytesEstimate : 0,
    };
  } catch {
    return defaultMemoryCompressionState();
  }
}

export async function saveMemoryCompressionState(state: MemoryCompressionPersisted): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.recursiveMemoryCompressionStrategicAbstraction,
    JSON.stringify(state),
  );
}

export async function persistCompressionCycle(opts: {
  chunk: CompressedTimelineChunk;
  snapshot: MetaStateSnapshot | null;
  rawBytes: number;
  compressedBytes: number;
}): Promise<{ compressionRatioPct: number }> {
  const state = await loadMemoryCompressionState();
  state.compressedTimeline.push(opts.chunk);
  state.compressedTimeline = state.compressedTimeline.slice(-COMPRESSED_TIMELINE_MAX);
  if (opts.snapshot) {
    state.metaSnapshots.push(opts.snapshot);
    state.metaSnapshots = state.metaSnapshots.slice(-META_SNAPSHOT_MAX);
  }
  state.rawBytesEstimate = opts.rawBytes;
  state.compressedBytesEstimate = opts.compressedBytes;
  await saveMemoryCompressionState(state);
  const ratio =
    opts.rawBytes <= 0
      ? 0
      : Math.round(100 * (1 - opts.compressedBytes / opts.rawBytes));
  return { compressionRatioPct: Math.max(0, Math.min(99, ratio)) };
}
