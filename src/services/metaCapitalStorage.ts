import AsyncStorage from '@react-native-async-storage/async-storage';
import { SNAPSHOT_MAX } from '../constants/metaCapital';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type {
  AllocationSnapshot,
  MetaCapitalControlState,
  StrategyCapitalSlice,
} from '../types/metaCapital';

let memoryCache: MetaCapitalControlState | null = null;

export function createDefaultMetaCapitalState(): MetaCapitalControlState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    snapshots: [],
    lastSlices: [],
  };
}

export function peekMetaCapitalState(): MetaCapitalControlState {
  return memoryCache ?? createDefaultMetaCapitalState();
}

export async function loadMetaCapitalState(): Promise<MetaCapitalControlState> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.metaCapital);
    if (!raw) {
      memoryCache = createDefaultMetaCapitalState();
      return memoryCache;
    }
    const parsed = JSON.parse(raw) as MetaCapitalControlState;
    if (parsed.version !== 1) {
      memoryCache = createDefaultMetaCapitalState();
      return memoryCache;
    }
    memoryCache = parsed;
    return parsed;
  } catch {
    memoryCache = createDefaultMetaCapitalState();
    return memoryCache;
  }
}

export async function saveMetaCapitalState(state: MetaCapitalControlState): Promise<void> {
  memoryCache = state;
  await AsyncStorage.setItem(STORAGE_KEYS.metaCapital, JSON.stringify(state));
}

export async function clearMetaCapitalState(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(STORAGE_KEYS.metaCapital);
}

export async function persistAllocationSnapshot(params: {
  slices: StrategyCapitalSlice[];
  stabilityScore: number;
}): Promise<MetaCapitalControlState> {
  const state = await loadMetaCapitalState();
  const snap: AllocationSnapshot = {
    id: `mcs_${Date.now()}`,
    capturedAt: new Date().toISOString(),
    slices: params.slices.map((s) => ({ ...s })),
    stabilityScore: params.stabilityScore,
  };
  state.snapshots = [snap, ...state.snapshots].slice(0, SNAPSHOT_MAX);
  state.lastSlices = params.slices.map((s) => ({ ...s }));
  state.updatedAt = new Date().toISOString();
  await saveMetaCapitalState(state);
  return state;
}
