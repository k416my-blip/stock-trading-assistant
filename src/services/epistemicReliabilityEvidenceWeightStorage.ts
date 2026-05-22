import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { RELIABILITY_TIMELINE_MAX } from '../constants/epistemicReliabilityEvidenceWeight';
import type { ReliabilityTimelinePoint } from '../types/epistemicReliabilityEvidenceWeight';

export type EpistemicReliabilityPersisted = {
  version: 1;
  reliabilityTimeline: ReliabilityTimelinePoint[];
  lastHealthScore: number | null;
  lastConsensusPct: number | null;
};

export function defaultEpistemicReliabilityState(): EpistemicReliabilityPersisted {
  return {
    version: 1,
    reliabilityTimeline: [],
    lastHealthScore: null,
    lastConsensusPct: null,
  };
}

export async function loadEpistemicReliabilityState(): Promise<EpistemicReliabilityPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.epistemicReliabilityEvidenceWeight);
    if (!raw) return defaultEpistemicReliabilityState();
    const parsed = JSON.parse(raw) as Partial<EpistemicReliabilityPersisted>;
    return {
      version: 1,
      reliabilityTimeline: Array.isArray(parsed.reliabilityTimeline)
        ? parsed.reliabilityTimeline.slice(-RELIABILITY_TIMELINE_MAX)
        : [],
      lastHealthScore:
        typeof parsed.lastHealthScore === 'number' ? parsed.lastHealthScore : null,
      lastConsensusPct:
        typeof parsed.lastConsensusPct === 'number' ? parsed.lastConsensusPct : null,
    };
  } catch {
    return defaultEpistemicReliabilityState();
  }
}

export async function saveEpistemicReliabilityState(
  state: EpistemicReliabilityPersisted,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.epistemicReliabilityEvidenceWeight, JSON.stringify(state));
}

export async function appendReliabilityTimelinePoint(
  point: ReliabilityTimelinePoint,
): Promise<number> {
  const state = await loadEpistemicReliabilityState();
  state.reliabilityTimeline.push(point);
  state.reliabilityTimeline = state.reliabilityTimeline.slice(-RELIABILITY_TIMELINE_MAX);
  state.lastHealthScore = point.healthScore;
  state.lastConsensusPct = point.consensusPct;
  await saveEpistemicReliabilityState(state);
  if (state.reliabilityTimeline.length < 2) return 0;
  const prev = state.reliabilityTimeline[state.reliabilityTimeline.length - 2];
  return Math.abs(point.consensusPct - prev.consensusPct);
}
