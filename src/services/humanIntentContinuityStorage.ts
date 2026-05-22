import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { INTENT_TIMELINE_MAX } from '../constants/humanIntentContinuityAlignmentPreservation';
import type {
  IntentAlignmentState,
  IntentTimelinePoint,
} from '../types/humanIntentContinuityAlignmentPreservation';

export type HumanIntentContinuityPersisted = {
  version: 1;
  lastAlignmentState: IntentAlignmentState;
  lastIntentHealthPct: number;
  lastOrchestrationBudgetMax: number;
  intentTimeline: IntentTimelinePoint[];
  refreshCount: number;
};

export function defaultHumanIntentContinuityState(): HumanIntentContinuityPersisted {
  return {
    version: 1,
    lastAlignmentState: 'INTENT_ALIGNED',
    lastIntentHealthPct: 82,
    lastOrchestrationBudgetMax: 88,
    intentTimeline: [],
    refreshCount: 0,
  };
}

export async function loadHumanIntentContinuityState(): Promise<HumanIntentContinuityPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.humanIntentContinuityAlignmentPreservation);
    if (!raw) return defaultHumanIntentContinuityState();
    const parsed = JSON.parse(raw) as Partial<HumanIntentContinuityPersisted>;
    return {
      version: 1,
      lastAlignmentState: (parsed.lastAlignmentState as IntentAlignmentState) ?? 'INTENT_ALIGNED',
      lastIntentHealthPct:
        typeof parsed.lastIntentHealthPct === 'number' ? parsed.lastIntentHealthPct : 82,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 88,
      intentTimeline: Array.isArray(parsed.intentTimeline)
        ? parsed.intentTimeline.slice(-INTENT_TIMELINE_MAX)
        : [],
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultHumanIntentContinuityState();
  }
}

export async function saveHumanIntentContinuityState(
  state: HumanIntentContinuityPersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.humanIntentContinuityAlignmentPreservation,
    JSON.stringify(state),
  );
}

export async function appendIntentSnapshot(
  point: IntentTimelinePoint,
): Promise<HumanIntentContinuityPersisted> {
  const state = await loadHumanIntentContinuityState();
  state.intentTimeline.push(point);
  state.intentTimeline = state.intentTimeline.slice(-INTENT_TIMELINE_MAX);
  state.lastAlignmentState = point.alignmentState;
  state.lastIntentHealthPct = point.intentHealthPct;
  state.refreshCount += 1;
  await saveHumanIntentContinuityState(state);
  return state;
}
