import AsyncStorage from '@react-native-async-storage/async-storage';
import { MACRO_INTEL_MAX_TIMELINE } from '../constants/macroIntelligence';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { MacroWorldRegimeId, RegimeTimelinePoint } from '../types/macroIntelligence';

export type MacroIntelligencePersisted = {
  version: 1;
  regimeTimeline: RegimeTimelinePoint[];
  lastNarrativeIds: string[];
};

export function defaultMacroIntelligenceState(): MacroIntelligencePersisted {
  return {
    version: 1,
    regimeTimeline: [],
    lastNarrativeIds: [],
  };
}

export async function loadMacroIntelligenceState(): Promise<MacroIntelligencePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.macroIntelligence);
    if (!raw) return defaultMacroIntelligenceState();
    const parsed = JSON.parse(raw) as Partial<MacroIntelligencePersisted>;
    return {
      version: 1,
      regimeTimeline: Array.isArray(parsed.regimeTimeline)
        ? parsed.regimeTimeline.slice(-MACRO_INTEL_MAX_TIMELINE)
        : [],
      lastNarrativeIds: Array.isArray(parsed.lastNarrativeIds)
        ? parsed.lastNarrativeIds.slice(-12)
        : [],
    };
  } catch {
    return defaultMacroIntelligenceState();
  }
}

export async function saveMacroIntelligenceState(state: MacroIntelligencePersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.macroIntelligence, JSON.stringify(state));
}

export function appendRegimeTimeline(
  timeline: RegimeTimelinePoint[],
  point: RegimeTimelinePoint,
): RegimeTimelinePoint[] {
  const last = timeline[timeline.length - 1];
  if (last && last.regimeId === point.regimeId && Math.abs(point.macroScore - last.macroScore) < 3) {
    return timeline;
  }
  return [...timeline, point].slice(-MACRO_INTEL_MAX_TIMELINE);
}
