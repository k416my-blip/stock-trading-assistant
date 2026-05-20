import AsyncStorage from '@react-native-async-storage/async-storage';
import { COOLING_MINUTES, LOSS_STREAK_COOLING_COUNT, MANUAL_OVERRIDE_LOG_MAX } from '../constants/behavioralRisk';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ManualOverrideEntry, OperatorBehaviorState } from '../types/behavioralRisk';

let memoryCache: OperatorBehaviorState | null = null;

function defaultState(): OperatorBehaviorState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    consecutiveLosses: 0,
    sessionStartedAt: new Date().toISOString(),
    manualOverrides: [],
  };
}

export function peekOperatorBehaviorState(): OperatorBehaviorState {
  return memoryCache ?? defaultState();
}

export async function loadOperatorBehaviorState(): Promise<OperatorBehaviorState> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.operatorBehavior);
    if (!raw) {
      memoryCache = defaultState();
      return memoryCache;
    }
    const parsed = JSON.parse(raw) as OperatorBehaviorState;
    if (parsed.version !== 1) {
      memoryCache = defaultState();
      return memoryCache;
    }
    memoryCache = parsed;
    return parsed;
  } catch {
    memoryCache = defaultState();
    return memoryCache;
  }
}

export async function saveOperatorBehaviorState(state: OperatorBehaviorState): Promise<void> {
  memoryCache = state;
  await AsyncStorage.setItem(STORAGE_KEYS.operatorBehavior, JSON.stringify(state));
}

export async function clearOperatorBehaviorState(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(STORAGE_KEYS.operatorBehavior);
}

export async function appendManualOverride(entry: Omit<ManualOverrideEntry, 'id'>): Promise<void> {
  const state = await loadOperatorBehaviorState();
  const row: ManualOverrideEntry = {
    id: `ov_${Date.now()}`,
    ...entry,
  };
  state.manualOverrides = [row, ...state.manualOverrides].slice(0, MANUAL_OVERRIDE_LOG_MAX);
  state.updatedAt = new Date().toISOString();
  await saveOperatorBehaviorState(state);
}

/** 売却損失後に連敗カウンタ更新 */
export async function recordTradeOutcomeForBehavior(params: {
  side: 'buy' | 'sell';
  realizedPnLMYR?: number;
}): Promise<OperatorBehaviorState> {
  const state = await loadOperatorBehaviorState();
  if (params.side === 'sell') {
    if (params.realizedPnLMYR != null && params.realizedPnLMYR < 0) {
      state.consecutiveLosses += 1;
    } else if (params.realizedPnLMYR != null && params.realizedPnLMYR >= 0) {
      state.consecutiveLosses = 0;
    }
  }
  if (
    state.consecutiveLosses >= LOSS_STREAK_COOLING_COUNT &&
    !state.coolingUntil
  ) {
    state.coolingUntil = new Date(Date.now() + COOLING_MINUTES * 60000).toISOString();
  }
  state.updatedAt = new Date().toISOString();
  await saveOperatorBehaviorState(state);
  return state;
}

export async function activateLossStreakCooling(untilIso: string): Promise<void> {
  const state = await loadOperatorBehaviorState();
  state.coolingUntil = untilIso;
  state.updatedAt = new Date().toISOString();
  await saveOperatorBehaviorState(state);
}
