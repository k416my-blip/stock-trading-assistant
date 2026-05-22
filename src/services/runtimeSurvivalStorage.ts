import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { RUNTIME_TIMELINE_MAX } from '../constants/runtimeSurvivalMobileResilience';
import type { RuntimeState, RuntimeTimelinePoint } from '../types/runtimeSurvivalMobileResilience';

export type RuntimeSurvivalPersisted = {
  version: 1;
  lastRuntimeState: RuntimeState;
  lastRuntimeHealthPct: number;
  lastOrchestrationBudgetMax: number;
  runtimeTimeline: RuntimeTimelinePoint[];
  lastRuntimePressurePct: number;
  lastResumeAt: string | null;
  refreshCount: number;
};

export function defaultRuntimeSurvivalState(): RuntimeSurvivalPersisted {
  return {
    version: 1,
    lastRuntimeState: 'RUNTIME_STABLE',
    lastRuntimeHealthPct: 82,
    lastOrchestrationBudgetMax: 92,
    runtimeTimeline: [],
    lastRuntimePressurePct: 25,
    lastResumeAt: null,
    refreshCount: 0,
  };
}

export async function loadRuntimeSurvivalState(): Promise<RuntimeSurvivalPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.runtimeSurvivalMobileResilience);
    if (!raw) return defaultRuntimeSurvivalState();
    const parsed = JSON.parse(raw) as Partial<RuntimeSurvivalPersisted>;
    return {
      version: 1,
      lastRuntimeState: (parsed.lastRuntimeState as RuntimeState) ?? 'RUNTIME_STABLE',
      lastRuntimeHealthPct:
        typeof parsed.lastRuntimeHealthPct === 'number' ? parsed.lastRuntimeHealthPct : 82,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 92,
      runtimeTimeline: Array.isArray(parsed.runtimeTimeline)
        ? parsed.runtimeTimeline.slice(-RUNTIME_TIMELINE_MAX)
        : [],
      lastRuntimePressurePct:
        typeof parsed.lastRuntimePressurePct === 'number' ? parsed.lastRuntimePressurePct : 25,
      lastResumeAt: typeof parsed.lastResumeAt === 'string' ? parsed.lastResumeAt : null,
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultRuntimeSurvivalState();
  }
}

export async function saveRuntimeSurvivalState(state: RuntimeSurvivalPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.runtimeSurvivalMobileResilience, JSON.stringify(state));
}

export async function appendRuntimeSnapshot(
  point: RuntimeTimelinePoint,
  runtimePressurePct: number,
  resumeAt?: string | null,
): Promise<RuntimeSurvivalPersisted> {
  const state = await loadRuntimeSurvivalState();
  state.runtimeTimeline.push(point);
  state.runtimeTimeline = state.runtimeTimeline.slice(-RUNTIME_TIMELINE_MAX);
  state.lastRuntimeState = point.runtimeState;
  state.lastRuntimeHealthPct = point.runtimeHealthPct;
  state.lastRuntimePressurePct = runtimePressurePct;
  if (resumeAt) state.lastResumeAt = resumeAt;
  state.refreshCount += 1;
  await saveRuntimeSurvivalState(state);
  return state;
}
