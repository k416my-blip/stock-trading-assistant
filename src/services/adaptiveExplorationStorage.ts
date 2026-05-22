import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { EXPLORATION_TIMELINE_MAX } from '../constants/adaptiveExplorationAntiDogma';
import type {
  ExplorationState,
  ExplorationTimelinePoint,
} from '../types/adaptiveExplorationAntiDogma';

export type AdaptiveExplorationPersisted = {
  version: 1;
  lastExplorationState: ExplorationState;
  lastExplorationHealthPct: number;
  lastOrchestrationBudgetMax: number;
  explorationTimeline: ExplorationTimelinePoint[];
  repetitionScorePct: number;
  refreshCount: number;
};

export function defaultAdaptiveExplorationState(): AdaptiveExplorationPersisted {
  return {
    version: 1,
    lastExplorationState: 'EXPLORATION_BALANCED',
    lastExplorationHealthPct: 72,
    lastOrchestrationBudgetMax: 86,
    explorationTimeline: [],
    repetitionScorePct: 22,
    refreshCount: 0,
  };
}

export async function loadAdaptiveExplorationState(): Promise<AdaptiveExplorationPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.adaptiveExplorationAntiDogma);
    if (!raw) return defaultAdaptiveExplorationState();
    const parsed = JSON.parse(raw) as Partial<AdaptiveExplorationPersisted>;
    return {
      version: 1,
      lastExplorationState: (parsed.lastExplorationState as ExplorationState) ?? 'EXPLORATION_BALANCED',
      lastExplorationHealthPct:
        typeof parsed.lastExplorationHealthPct === 'number' ? parsed.lastExplorationHealthPct : 72,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 86,
      explorationTimeline: Array.isArray(parsed.explorationTimeline)
        ? parsed.explorationTimeline.slice(-EXPLORATION_TIMELINE_MAX)
        : [],
      repetitionScorePct:
        typeof parsed.repetitionScorePct === 'number' ? parsed.repetitionScorePct : 22,
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultAdaptiveExplorationState();
  }
}

export async function saveAdaptiveExplorationState(
  state: AdaptiveExplorationPersisted,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.adaptiveExplorationAntiDogma, JSON.stringify(state));
}

export async function appendExplorationSnapshot(
  point: ExplorationTimelinePoint,
  repetitionScorePct: number,
): Promise<AdaptiveExplorationPersisted> {
  const state = await loadAdaptiveExplorationState();
  state.explorationTimeline.push(point);
  state.explorationTimeline = state.explorationTimeline.slice(-EXPLORATION_TIMELINE_MAX);
  state.lastExplorationState = point.explorationState;
  state.lastExplorationHealthPct = point.explorationHealthPct;
  state.repetitionScorePct = repetitionScorePct;
  state.refreshCount += 1;
  await saveAdaptiveExplorationState(state);
  return state;
}
