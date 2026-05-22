import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ConciergeEventRecord } from '../types/reactiveEventOrchestration';

export type PersistedReactiveEvents = {
  version: 1;
  importantEvents: ConciergeEventRecord[];
  lastReplayAt: string | null;
};

export function defaultPersistedReactiveEvents(): PersistedReactiveEvents {
  return { version: 1, importantEvents: [], lastReplayAt: null };
}

export async function loadPersistedReactiveEvents(): Promise<PersistedReactiveEvents> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.reactiveEventOrchestration);
    if (!raw) return defaultPersistedReactiveEvents();
    const parsed = JSON.parse(raw) as Partial<PersistedReactiveEvents>;
    return {
      version: 1,
      importantEvents: Array.isArray(parsed.importantEvents)
        ? parsed.importantEvents.slice(-40)
        : [],
      lastReplayAt: parsed.lastReplayAt ?? null,
    };
  } catch {
    return defaultPersistedReactiveEvents();
  }
}

export async function persistImportantEvent(event: ConciergeEventRecord): Promise<void> {
  const state = await loadPersistedReactiveEvents();
  state.importantEvents.push(event);
  state.importantEvents = state.importantEvents.slice(-40);
  await AsyncStorage.setItem(STORAGE_KEYS.reactiveEventOrchestration, JSON.stringify(state));
}

export async function markReactiveReplayComplete(): Promise<void> {
  const state = await loadPersistedReactiveEvents();
  state.lastReplayAt = new Date().toISOString();
  await AsyncStorage.setItem(STORAGE_KEYS.reactiveEventOrchestration, JSON.stringify(state));
}
