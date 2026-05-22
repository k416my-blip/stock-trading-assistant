import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { EXECUTIVE_TIMELINE_MAX } from '../constants/unifiedCognitiveStateExecutiveAwareness';
import type {
  ExecutiveState,
  ExecutiveTimelinePoint,
} from '../types/unifiedCognitiveStateExecutiveAwareness';

export type UnifiedCognitiveStatePersisted = {
  version: 1;
  lastExecutiveState: ExecutiveState;
  lastExecutiveHealthPct: number;
  lastOrchestrationBudgetMax: number;
  executiveTimeline: ExecutiveTimelinePoint[];
  refreshCount: number;
};

export function defaultUnifiedCognitiveState(): UnifiedCognitiveStatePersisted {
  return {
    version: 1,
    lastExecutiveState: 'EXECUTIVE_STABLE',
    lastExecutiveHealthPct: 82,
    lastOrchestrationBudgetMax: 88,
    executiveTimeline: [],
    refreshCount: 0,
  };
}

export async function loadUnifiedCognitiveState(): Promise<UnifiedCognitiveStatePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.unifiedCognitiveStateExecutiveAwareness);
    if (!raw) return defaultUnifiedCognitiveState();
    const parsed = JSON.parse(raw) as Partial<UnifiedCognitiveStatePersisted>;
    return {
      version: 1,
      lastExecutiveState: (parsed.lastExecutiveState as ExecutiveState) ?? 'EXECUTIVE_STABLE',
      lastExecutiveHealthPct:
        typeof parsed.lastExecutiveHealthPct === 'number' ? parsed.lastExecutiveHealthPct : 82,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 88,
      executiveTimeline: Array.isArray(parsed.executiveTimeline)
        ? parsed.executiveTimeline.slice(-EXECUTIVE_TIMELINE_MAX)
        : [],
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultUnifiedCognitiveState();
  }
}

export async function saveUnifiedCognitiveState(
  state: UnifiedCognitiveStatePersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.unifiedCognitiveStateExecutiveAwareness,
    JSON.stringify(state),
  );
}

export async function appendExecutiveSnapshot(
  point: ExecutiveTimelinePoint,
): Promise<UnifiedCognitiveStatePersisted> {
  const state = await loadUnifiedCognitiveState();
  state.executiveTimeline.push(point);
  state.executiveTimeline = state.executiveTimeline.slice(-EXECUTIVE_TIMELINE_MAX);
  state.lastExecutiveState = point.executiveState;
  state.lastExecutiveHealthPct = point.executiveHealthPct;
  state.refreshCount += 1;
  await saveUnifiedCognitiveState(state);
  return state;
}
