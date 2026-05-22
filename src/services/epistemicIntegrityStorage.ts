import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { EPISTEMIC_TIMELINE_MAX } from '../constants/epistemicIntegrityTruthCalibration';
import type {
  EpistemicSnapshotPoint,
  EpistemicIntegrityState,
} from '../types/epistemicIntegrityTruthCalibration';

export type EpistemicIntegrityPersisted = {
  version: 1;
  lastEpistemicState: EpistemicIntegrityState;
  lastEpistemicHealthPct: number;
  lastOrchestrationBudgetMax: number;
  epistemicTimeline: EpistemicSnapshotPoint[];
  refreshCount: number;
};

export function defaultEpistemicIntegrityState(): EpistemicIntegrityPersisted {
  return {
    version: 1,
    lastEpistemicState: 'EPISTEMIC_STABLE',
    lastEpistemicHealthPct: 76,
    lastOrchestrationBudgetMax: 86,
    epistemicTimeline: [],
    refreshCount: 0,
  };
}

export async function loadEpistemicIntegrityState(): Promise<EpistemicIntegrityPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.epistemicIntegrityTruthCalibration);
    if (!raw) return defaultEpistemicIntegrityState();
    const parsed = JSON.parse(raw) as Partial<EpistemicIntegrityPersisted>;
    return {
      version: 1,
      lastEpistemicState:
        (parsed.lastEpistemicState as EpistemicIntegrityState) ?? 'EPISTEMIC_STABLE',
      lastEpistemicHealthPct:
        typeof parsed.lastEpistemicHealthPct === 'number' ? parsed.lastEpistemicHealthPct : 76,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 86,
      epistemicTimeline: Array.isArray(parsed.epistemicTimeline)
        ? parsed.epistemicTimeline.slice(-EPISTEMIC_TIMELINE_MAX)
        : [],
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultEpistemicIntegrityState();
  }
}

export async function saveEpistemicIntegrityState(
  state: EpistemicIntegrityPersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.epistemicIntegrityTruthCalibration,
    JSON.stringify(state),
  );
}

export async function appendEpistemicSnapshot(
  point: EpistemicSnapshotPoint,
): Promise<EpistemicIntegrityPersisted> {
  const state = await loadEpistemicIntegrityState();
  state.epistemicTimeline.push(point);
  state.epistemicTimeline = state.epistemicTimeline.slice(-EPISTEMIC_TIMELINE_MAX);
  state.lastEpistemicState = point.epistemicState;
  state.lastEpistemicHealthPct = point.epistemicHealthPct;
  state.refreshCount += 1;
  await saveEpistemicIntegrityState(state);
  return state;
}
