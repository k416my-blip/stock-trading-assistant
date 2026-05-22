import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ProactiveSuggestionCategory } from '../types/proactiveSuggestion';

export type MetaDecisionDailyBudget = {
  dateKey: string;
  criticalShown: number;
  highShown: number;
};

export type MetaFatigueEntry = {
  category: ProactiveSuggestionCategory;
  symbol: string | null;
  at: string;
};

export type MetaDecisionPersisted = {
  version: 1;
  dailyBudget: MetaDecisionDailyBudget;
  fatigueLog: MetaFatigueEntry[];
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultMetaDecisionState(): MetaDecisionPersisted {
  return {
    version: 1,
    dailyBudget: { dateKey: todayKey(), criticalShown: 0, highShown: 0 },
    fatigueLog: [],
  };
}

export async function loadMetaDecisionState(): Promise<MetaDecisionPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.metaDecision);
    if (!raw) return defaultMetaDecisionState();
    const parsed = JSON.parse(raw) as Partial<MetaDecisionPersisted>;
    const budget = parsed.dailyBudget;
    const dateKey = budget?.dateKey ?? todayKey();
    return {
      version: 1,
      dailyBudget: {
        dateKey,
        criticalShown:
          dateKey === todayKey() ? (budget?.criticalShown ?? 0) : 0,
        highShown: dateKey === todayKey() ? (budget?.highShown ?? 0) : 0,
      },
      fatigueLog: Array.isArray(parsed.fatigueLog) ? parsed.fatigueLog.slice(-40) : [],
    };
  } catch {
    return defaultMetaDecisionState();
  }
}

export async function saveMetaDecisionState(state: MetaDecisionPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.metaDecision, JSON.stringify(state));
}

export async function recordMetaFatigueEntry(
  category: ProactiveSuggestionCategory,
  symbol: string | null,
): Promise<void> {
  const state = await loadMetaDecisionState();
  state.fatigueLog.push({ category, symbol, at: new Date().toISOString() });
  state.fatigueLog = state.fatigueLog.slice(-40);
  await saveMetaDecisionState(state);
}

export async function incrementMetaDailyBudget(
  priority: 'critical' | 'high',
): Promise<MetaDecisionDailyBudget> {
  const state = await loadMetaDecisionState();
  const key = todayKey();
  if (state.dailyBudget.dateKey !== key) {
    state.dailyBudget = { dateKey: key, criticalShown: 0, highShown: 0 };
  }
  if (priority === 'critical') state.dailyBudget.criticalShown += 1;
  else state.dailyBudget.highShown += 1;
  await saveMetaDecisionState(state);
  return state.dailyBudget;
}
