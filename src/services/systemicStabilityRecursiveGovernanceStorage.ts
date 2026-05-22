import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { STABILITY_TIMELINE_MAX } from '../constants/systemicStabilityRecursiveGovernance';
import type {
  MetaStabilitySnapshot,
  StabilityTimelinePoint,
} from '../types/systemicStabilityRecursiveGovernance';

export type SystemicStabilityPersisted = {
  version: 1;
  stabilityTimeline: StabilityTimelinePoint[];
  metaStabilitySnapshots: MetaStabilitySnapshot[];
  lastStabilityHealth: number | null;
};

export function defaultSystemicStabilityState(): SystemicStabilityPersisted {
  return {
    version: 1,
    stabilityTimeline: [],
    metaStabilitySnapshots: [],
    lastStabilityHealth: null,
  };
}

export async function loadSystemicStabilityState(): Promise<SystemicStabilityPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.systemicStabilityRecursiveGovernance);
    if (!raw) return defaultSystemicStabilityState();
    const parsed = JSON.parse(raw) as Partial<SystemicStabilityPersisted>;
    return {
      version: 1,
      stabilityTimeline: Array.isArray(parsed.stabilityTimeline)
        ? parsed.stabilityTimeline.slice(-STABILITY_TIMELINE_MAX)
        : [],
      metaStabilitySnapshots: Array.isArray(parsed.metaStabilitySnapshots)
        ? parsed.metaStabilitySnapshots.slice(-12)
        : [],
      lastStabilityHealth:
        typeof parsed.lastStabilityHealth === 'number' ? parsed.lastStabilityHealth : null,
    };
  } catch {
    return defaultSystemicStabilityState();
  }
}

export async function saveSystemicStabilityState(state: SystemicStabilityPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.systemicStabilityRecursiveGovernance, JSON.stringify(state));
}

export async function appendStabilityTimelinePoint(
  point: StabilityTimelinePoint,
  snapshot: MetaStabilitySnapshot | null,
): Promise<number> {
  const state = await loadSystemicStabilityState();
  state.stabilityTimeline.push(point);
  state.stabilityTimeline = state.stabilityTimeline.slice(-STABILITY_TIMELINE_MAX);
  if (snapshot) {
    state.metaStabilitySnapshots.push(snapshot);
    state.metaStabilitySnapshots = state.metaStabilitySnapshots.slice(-12);
  }
  state.lastStabilityHealth = point.stabilityHealth;
  await saveSystemicStabilityState(state);
  if (state.stabilityTimeline.length < 2) return 0;
  const prev = state.stabilityTimeline[state.stabilityTimeline.length - 2];
  return Math.abs(point.stabilityHealth - prev.stabilityHealth);
}
