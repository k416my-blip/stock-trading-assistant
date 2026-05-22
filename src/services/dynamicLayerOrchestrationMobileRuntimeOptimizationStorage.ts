import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ORCHESTRATION_TIMELINE_MAX } from '../constants/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { OrchestrationTimelinePoint } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { OrchestratedLayerId } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';

export type LayerCacheEntry = {
  fingerprint: string;
  at: string;
  version: number;
};

export type DynamicOrchestrationPersisted = {
  version: 1;
  layerCache: Partial<Record<OrchestratedLayerId, LayerCacheEntry>>;
  orchestrationTimeline: OrchestrationTimelinePoint[];
  lastFingerprint: string | null;
};

export function defaultDynamicOrchestrationState(): DynamicOrchestrationPersisted {
  return {
    version: 1,
    layerCache: {},
    orchestrationTimeline: [],
    lastFingerprint: null,
  };
}

export async function loadDynamicOrchestrationState(): Promise<DynamicOrchestrationPersisted> {
  try {
    const raw = await AsyncStorage.getItem(
      STORAGE_KEYS.dynamicLayerOrchestrationMobileRuntimeOptimization,
    );
    if (!raw) return defaultDynamicOrchestrationState();
    const parsed = JSON.parse(raw) as Partial<DynamicOrchestrationPersisted>;
    return {
      version: 1,
      layerCache: parsed.layerCache ?? {},
      orchestrationTimeline: Array.isArray(parsed.orchestrationTimeline)
        ? parsed.orchestrationTimeline.slice(-ORCHESTRATION_TIMELINE_MAX)
        : [],
      lastFingerprint: typeof parsed.lastFingerprint === 'string' ? parsed.lastFingerprint : null,
    };
  } catch {
    return defaultDynamicOrchestrationState();
  }
}

export async function saveDynamicOrchestrationState(
  state: DynamicOrchestrationPersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.dynamicLayerOrchestrationMobileRuntimeOptimization,
    JSON.stringify(state),
  );
}

export async function noteLayerCacheHit(
  layerId: OrchestratedLayerId,
  fingerprint: string,
): Promise<boolean> {
  const state = await loadDynamicOrchestrationState();
  const prev = state.layerCache[layerId];
  if (!prev || prev.fingerprint !== fingerprint) return false;
  return true;
}

export async function persistLayerCache(
  layerId: OrchestratedLayerId,
  fingerprint: string,
): Promise<void> {
  const state = await loadDynamicOrchestrationState();
  state.layerCache[layerId] = {
    fingerprint,
    at: new Date().toISOString(),
    version: 1,
  };
  state.lastFingerprint = fingerprint;
  await saveDynamicOrchestrationState(state);
}

export async function appendOrchestrationTimeline(
  point: OrchestrationTimelinePoint,
): Promise<void> {
  const state = await loadDynamicOrchestrationState();
  state.orchestrationTimeline.push(point);
  state.orchestrationTimeline = state.orchestrationTimeline.slice(-ORCHESTRATION_TIMELINE_MAX);
  await saveDynamicOrchestrationState(state);
}
