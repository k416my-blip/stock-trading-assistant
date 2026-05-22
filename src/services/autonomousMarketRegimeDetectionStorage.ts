import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { REGIME_TIMELINE_MAX } from '../constants/autonomousMarketRegimeDetection';
import type {
  MarketRegimeCategory,
  RegimeTimelinePoint,
} from '../types/autonomousMarketRegimeDetection';

export type MarketRegimePersisted = {
  version: 1;
  lastRegime: MarketRegimeCategory;
  lastOrchestrationBudgetMax: number;
  regimeTimeline: RegimeTimelinePoint[];
  adaptationCooldownUntil: string | null;
};

export function defaultMarketRegimeState(): MarketRegimePersisted {
  return {
    version: 1,
    lastRegime: 'SIDEWAYS',
    lastOrchestrationBudgetMax: 85,
    regimeTimeline: [],
    adaptationCooldownUntil: null,
  };
}

export async function loadMarketRegimeState(): Promise<MarketRegimePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.autonomousMarketRegimeDetection);
    if (!raw) return defaultMarketRegimeState();
    const parsed = JSON.parse(raw) as Partial<MarketRegimePersisted>;
    return {
      version: 1,
      lastRegime: (parsed.lastRegime as MarketRegimeCategory) ?? 'SIDEWAYS',
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 85,
      regimeTimeline: Array.isArray(parsed.regimeTimeline)
        ? parsed.regimeTimeline.slice(-REGIME_TIMELINE_MAX)
        : [],
      adaptationCooldownUntil:
        typeof parsed.adaptationCooldownUntil === 'string'
          ? parsed.adaptationCooldownUntil
          : null,
    };
  } catch {
    return defaultMarketRegimeState();
  }
}

export async function saveMarketRegimeState(state: MarketRegimePersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.autonomousMarketRegimeDetection, JSON.stringify(state));
}

export async function appendRegimeTimelinePoint(point: RegimeTimelinePoint): Promise<void> {
  const state = await loadMarketRegimeState();
  state.regimeTimeline.push(point);
  state.regimeTimeline = state.regimeTimeline.slice(-REGIME_TIMELINE_MAX);
  state.lastRegime = point.regime;
  await saveMarketRegimeState(state);
}
