import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { LONGITUDINAL_TIMELINE_MAX } from '../constants/metaReliabilityLongitudinalTrust';
import type {
  LongitudinalSnapshotPoint,
  LongitudinalTrustState,
} from '../types/metaReliabilityLongitudinalTrust';

export type MetaReliabilityPersisted = {
  version: 1;
  lastTrustState: LongitudinalTrustState;
  lastMetaReliabilityPct: number;
  lastOrchestrationBudgetMax: number;
  longitudinalTimeline: LongitudinalSnapshotPoint[];
  lastFinalDecision: string;
  lastRegimeId: string;
  refreshCount: number;
};

export function defaultMetaReliabilityState(): MetaReliabilityPersisted {
  return {
    version: 1,
    lastTrustState: 'TRUST_STABLE',
    lastMetaReliabilityPct: 75,
    lastOrchestrationBudgetMax: 85,
    longitudinalTimeline: [],
    lastFinalDecision: 'hold',
    lastRegimeId: 'neutral',
    refreshCount: 0,
  };
}

export async function loadMetaReliabilityState(): Promise<MetaReliabilityPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.metaReliabilityLongitudinalTrust);
    if (!raw) return defaultMetaReliabilityState();
    const parsed = JSON.parse(raw) as Partial<MetaReliabilityPersisted>;
    return {
      version: 1,
      lastTrustState: (parsed.lastTrustState as LongitudinalTrustState) ?? 'TRUST_STABLE',
      lastMetaReliabilityPct:
        typeof parsed.lastMetaReliabilityPct === 'number' ? parsed.lastMetaReliabilityPct : 75,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 85,
      longitudinalTimeline: Array.isArray(parsed.longitudinalTimeline)
        ? parsed.longitudinalTimeline.slice(-LONGITUDINAL_TIMELINE_MAX)
        : [],
      lastFinalDecision:
        typeof parsed.lastFinalDecision === 'string' ? parsed.lastFinalDecision : 'hold',
      lastRegimeId: typeof parsed.lastRegimeId === 'string' ? parsed.lastRegimeId : 'neutral',
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultMetaReliabilityState();
  }
}

export async function saveMetaReliabilityState(state: MetaReliabilityPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.metaReliabilityLongitudinalTrust, JSON.stringify(state));
}

export async function appendLongitudinalSnapshot(
  point: LongitudinalSnapshotPoint,
  finalDecision: string,
  regimeId: string,
): Promise<MetaReliabilityPersisted> {
  const state = await loadMetaReliabilityState();
  state.longitudinalTimeline.push(point);
  state.longitudinalTimeline = state.longitudinalTimeline.slice(-LONGITUDINAL_TIMELINE_MAX);
  state.lastTrustState = point.trustState;
  state.lastMetaReliabilityPct = point.metaReliabilityPct;
  state.lastFinalDecision = finalDecision;
  state.lastRegimeId = regimeId;
  state.refreshCount += 1;
  await saveMetaReliabilityState(state);
  return state;
}
