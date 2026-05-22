import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ECONOMY_TIMELINE_MAX } from '../constants/cognitiveResourceEconomyAttentionAllocation';
import type {
  EconomyTimelinePoint,
  ResourceEconomyState,
} from '../types/cognitiveResourceEconomyAttentionAllocation';

export type CognitiveResourceEconomyPersisted = {
  version: 1;
  lastResourceState: ResourceEconomyState;
  lastResourceHealthPct: number;
  lastOrchestrationBudgetMax: number;
  economyTimeline: EconomyTimelinePoint[];
  refreshCount: number;
};

export function defaultCognitiveResourceEconomyState(): CognitiveResourceEconomyPersisted {
  return {
    version: 1,
    lastResourceState: 'RESOURCE_BALANCED',
    lastResourceHealthPct: 80,
    lastOrchestrationBudgetMax: 88,
    economyTimeline: [],
    refreshCount: 0,
  };
}

export async function loadCognitiveResourceEconomyState(): Promise<CognitiveResourceEconomyPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.cognitiveResourceEconomyAttentionAllocation);
    if (!raw) return defaultCognitiveResourceEconomyState();
    const parsed = JSON.parse(raw) as Partial<CognitiveResourceEconomyPersisted>;
    return {
      version: 1,
      lastResourceState: (parsed.lastResourceState as ResourceEconomyState) ?? 'RESOURCE_BALANCED',
      lastResourceHealthPct:
        typeof parsed.lastResourceHealthPct === 'number' ? parsed.lastResourceHealthPct : 80,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 88,
      economyTimeline: Array.isArray(parsed.economyTimeline)
        ? parsed.economyTimeline.slice(-ECONOMY_TIMELINE_MAX)
        : [],
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultCognitiveResourceEconomyState();
  }
}

export async function saveCognitiveResourceEconomyState(
  state: CognitiveResourceEconomyPersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.cognitiveResourceEconomyAttentionAllocation,
    JSON.stringify(state),
  );
}

export async function appendEconomySnapshot(
  point: EconomyTimelinePoint,
): Promise<CognitiveResourceEconomyPersisted> {
  const state = await loadCognitiveResourceEconomyState();
  state.economyTimeline.push(point);
  state.economyTimeline = state.economyTimeline.slice(-ECONOMY_TIMELINE_MAX);
  state.lastResourceState = point.resourceState;
  state.lastResourceHealthPct = point.resourceHealthPct;
  state.refreshCount += 1;
  await saveCognitiveResourceEconomyState(state);
  return state;
}
