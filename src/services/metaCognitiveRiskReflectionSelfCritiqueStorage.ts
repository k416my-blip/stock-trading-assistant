import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { DRIFT_TIMELINE_MAX } from '../constants/metaCognitiveRiskReflectionSelfCritique';
import type { DriftTimelinePoint } from '../types/metaCognitiveRiskReflectionSelfCritique';

export type MetaCognitiveReflectionPersisted = {
  version: 1;
  driftTimeline: DriftTimelinePoint[];
  rollbackCount: number;
  freezeCount: number;
  lastMetaConfidence: number | null;
};

export function defaultMetaCognitiveReflectionState(): MetaCognitiveReflectionPersisted {
  return {
    version: 1,
    driftTimeline: [],
    rollbackCount: 0,
    freezeCount: 0,
    lastMetaConfidence: null,
  };
}

export async function loadMetaCognitiveReflectionState(): Promise<MetaCognitiveReflectionPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.metaCognitiveRiskReflectionSelfCritique);
    if (!raw) return defaultMetaCognitiveReflectionState();
    const parsed = JSON.parse(raw) as Partial<MetaCognitiveReflectionPersisted>;
    return {
      version: 1,
      driftTimeline: Array.isArray(parsed.driftTimeline)
        ? parsed.driftTimeline.slice(-DRIFT_TIMELINE_MAX)
        : [],
      rollbackCount: typeof parsed.rollbackCount === 'number' ? parsed.rollbackCount : 0,
      freezeCount: typeof parsed.freezeCount === 'number' ? parsed.freezeCount : 0,
      lastMetaConfidence:
        typeof parsed.lastMetaConfidence === 'number' ? parsed.lastMetaConfidence : null,
    };
  } catch {
    return defaultMetaCognitiveReflectionState();
  }
}

export async function saveMetaCognitiveReflectionState(
  state: MetaCognitiveReflectionPersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.metaCognitiveRiskReflectionSelfCritique,
    JSON.stringify(state),
  );
}

export async function appendDriftTimelinePoint(
  point: DriftTimelinePoint,
  opts: { rollbackApplied: boolean; freezeActive: boolean },
): Promise<{ driftDelta: number; rollbackCount: number; freezeCount: number }> {
  const state = await loadMetaCognitiveReflectionState();
  if (opts.rollbackApplied) state.rollbackCount += 1;
  if (opts.freezeActive) state.freezeCount += 1;
  state.driftTimeline.push(point);
  state.driftTimeline = state.driftTimeline.slice(-DRIFT_TIMELINE_MAX);
  state.lastMetaConfidence = point.metaConfidencePct;
  await saveMetaCognitiveReflectionState(state);

  let driftDelta = 0;
  if (state.driftTimeline.length >= 2) {
    const prev = state.driftTimeline[state.driftTimeline.length - 2];
    driftDelta = Math.abs(point.confidenceDriftPct - prev.confidenceDriftPct);
  }
  return { driftDelta, rollbackCount: state.rollbackCount, freezeCount: state.freezeCount };
}
