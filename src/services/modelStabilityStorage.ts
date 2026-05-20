import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BASE_LEARNING_RATE,
  FREEZE_HOURS_ON_CRITICAL,
  QUARANTINE_HOURS,
  SNAPSHOT_MAX,
  WEIGHT_HISTORY_MAX,
} from '../constants/modelStability';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ScoreWeights } from './analysis/aiLearning';
import type {
  ModelControlMode,
  ModelStabilityControlState,
  RollbackSnapshot,
} from '../types/modelStability';
import type { MarketRegimeId } from '../types/marketRegime';

let memoryCache: ModelStabilityControlState | null = null;

export function createDefaultModelStabilityState(): ModelStabilityControlState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    controlMode: 'normal',
    snapshots: [],
    weightHistory: [],
    mutationsLast24h: 0,
    governedLearningRate: BASE_LEARNING_RATE,
  };
}

export function peekModelStabilityState(): ModelStabilityControlState {
  return memoryCache ?? createDefaultModelStabilityState();
}

export async function loadModelStabilityState(): Promise<ModelStabilityControlState> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.modelStability);
    if (!raw) {
      memoryCache = createDefaultModelStabilityState();
      return memoryCache;
    }
    const parsed = JSON.parse(raw) as ModelStabilityControlState;
    if (parsed.version !== 1) {
      memoryCache = createDefaultModelStabilityState();
      return memoryCache;
    }
    memoryCache = parsed;
    return parsed;
  } catch {
    memoryCache = createDefaultModelStabilityState();
    return memoryCache;
  }
}

export async function saveModelStabilityState(state: ModelStabilityControlState): Promise<void> {
  memoryCache = state;
  await AsyncStorage.setItem(STORAGE_KEYS.modelStability, JSON.stringify(state));
}

export async function clearModelStabilityState(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(STORAGE_KEYS.modelStability);
}

export async function appendWeightSnapshot(params: {
  weights: ScoreWeights;
  stabilityScore: number;
  labelJa?: string;
}): Promise<ModelStabilityControlState> {
  const state = await loadModelStabilityState();
  const snap: RollbackSnapshot = {
    id: `snap_${Date.now()}`,
    capturedAt: new Date().toISOString(),
    weights: { ...params.weights },
    stabilityScore: params.stabilityScore,
    labelJa: params.labelJa ?? `安定スコア ${params.stabilityScore}`,
  };
  state.snapshots = [snap, ...state.snapshots].slice(0, SNAPSHOT_MAX);
  state.weightHistory = [
    { capturedAt: snap.capturedAt, weights: { ...params.weights } },
    ...state.weightHistory,
  ].slice(0, WEIGHT_HISTORY_MAX);
  state.updatedAt = new Date().toISOString();
  await saveModelStabilityState(state);
  return state;
}

export async function recordWeightMutation(): Promise<ModelStabilityControlState> {
  const state = await loadModelStabilityState();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  if (state.lastMutationAt && new Date(state.lastMutationAt).getTime() < dayAgo) {
    state.mutationsLast24h = 0;
  }
  state.mutationsLast24h += 1;
  state.lastMutationAt = new Date().toISOString();
  state.updatedAt = state.lastMutationAt;
  await saveModelStabilityState(state);
  return state;
}

export async function setControlMode(
  mode: ModelControlMode,
  options?: { hours?: number },
): Promise<ModelStabilityControlState> {
  const state = await loadModelStabilityState();
  state.controlMode = mode;
  const hours = options?.hours ?? (mode === 'quarantine' ? QUARANTINE_HOURS : FREEZE_HOURS_ON_CRITICAL);
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  if (mode === 'freeze') state.freezeUntil = until;
  else if (mode === 'quarantine') state.quarantineUntil = until;
  else if (mode === 'safe') {
    state.freezeUntil = until;
    state.quarantineUntil = until;
  } else {
    state.freezeUntil = undefined;
    state.quarantineUntil = undefined;
  }
  state.updatedAt = new Date().toISOString();
  await saveModelStabilityState(state);
  return state;
}

export async function updateRegimeMemory(regimeId: MarketRegimeId): Promise<void> {
  const state = await loadModelStabilityState();
  if (state.lastRegimeId !== regimeId) {
    state.lastRegimeId = regimeId;
    state.regimeEnteredAt = new Date().toISOString();
    state.updatedAt = state.regimeEnteredAt;
    await saveModelStabilityState(state);
  }
}

export async function restoreSnapshot(snapshotId: string): Promise<RollbackSnapshot | null> {
  const state = await loadModelStabilityState();
  const snap = state.snapshots.find((s) => s.id === snapshotId);
  if (!snap) return null;
  state.controlMode = 'normal';
  state.freezeUntil = undefined;
  state.quarantineUntil = undefined;
  state.updatedAt = new Date().toISOString();
  await saveModelStabilityState(state);
  return snap;
}
