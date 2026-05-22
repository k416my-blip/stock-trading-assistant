import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ARBITRATION_TIMELINE_MAX } from '../constants/cognitiveGoalArbitrationIntentPriority';
import type { ArbitrationTimelinePoint } from '../types/cognitiveGoalArbitrationIntentPriority';

export type CognitiveGoalArbitrationPersisted = {
  version: 1;
  arbitrationTimeline: ArbitrationTimelinePoint[];
  lastHealthScore: number | null;
  lastPriorityDrift: number | null;
};

export function defaultCognitiveGoalArbitrationState(): CognitiveGoalArbitrationPersisted {
  return {
    version: 1,
    arbitrationTimeline: [],
    lastHealthScore: null,
    lastPriorityDrift: null,
  };
}

export async function loadCognitiveGoalArbitrationState(): Promise<CognitiveGoalArbitrationPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.cognitiveGoalArbitrationIntentPriority);
    if (!raw) return defaultCognitiveGoalArbitrationState();
    const parsed = JSON.parse(raw) as Partial<CognitiveGoalArbitrationPersisted>;
    return {
      version: 1,
      arbitrationTimeline: Array.isArray(parsed.arbitrationTimeline)
        ? parsed.arbitrationTimeline.slice(-ARBITRATION_TIMELINE_MAX)
        : [],
      lastHealthScore:
        typeof parsed.lastHealthScore === 'number' ? parsed.lastHealthScore : null,
      lastPriorityDrift:
        typeof parsed.lastPriorityDrift === 'number' ? parsed.lastPriorityDrift : null,
    };
  } catch {
    return defaultCognitiveGoalArbitrationState();
  }
}

export async function saveCognitiveGoalArbitrationState(
  state: CognitiveGoalArbitrationPersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.cognitiveGoalArbitrationIntentPriority,
    JSON.stringify(state),
  );
}

export async function appendArbitrationTimelinePoint(
  point: ArbitrationTimelinePoint,
): Promise<number> {
  const state = await loadCognitiveGoalArbitrationState();
  state.arbitrationTimeline.push(point);
  state.arbitrationTimeline = state.arbitrationTimeline.slice(-ARBITRATION_TIMELINE_MAX);
  state.lastHealthScore = point.healthScore;
  await saveCognitiveGoalArbitrationState(state);
  if (state.arbitrationTimeline.length < 2) return 0;
  const prev = state.arbitrationTimeline[state.arbitrationTimeline.length - 2];
  return point.deadlockDetected !== prev.deadlockDetected ? 15 : Math.abs(point.healthScore - prev.healthScore);
}
