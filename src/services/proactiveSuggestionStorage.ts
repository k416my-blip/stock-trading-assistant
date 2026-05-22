import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROACTIVE_SUGGESTION_MAX } from '../constants/proactiveConcierge';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  countUnhandledProactive,
  type ProactiveSuggestionsPersisted,
  type ProactiveSuggestion,
} from '../types/proactiveSuggestion';

const EMPTY: ProactiveSuggestionsPersisted = {
  version: 1,
  suggestions: [],
  fingerprint: null,
  suppressUntil: {},
  unreadCount: 0,
};

function trimSuggestions(suggestions: ProactiveSuggestion[]): ProactiveSuggestion[] {
  return suggestions
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, PROACTIVE_SUGGESTION_MAX);
}

export async function loadProactiveSuggestionsState(): Promise<ProactiveSuggestionsPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.proactiveSuggestions);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<ProactiveSuggestionsPersisted>;
    const suggestions = trimSuggestions(
      Array.isArray(parsed.suggestions) ? (parsed.suggestions as ProactiveSuggestion[]) : [],
    );
    return {
      version: 1,
      suggestions,
      fingerprint: parsed.fingerprint ?? null,
      suppressUntil:
        parsed.suppressUntil && typeof parsed.suppressUntil === 'object'
          ? parsed.suppressUntil
          : {},
      unreadCount: countUnhandledProactive(suggestions),
      lastResumeSummaryAt:
        typeof parsed.lastResumeSummaryAt === 'string' ? parsed.lastResumeSummaryAt : undefined,
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveProactiveSuggestionsState(
  state: ProactiveSuggestionsPersisted,
): Promise<void> {
  const suggestions = trimSuggestions(state.suggestions);
  const payload: ProactiveSuggestionsPersisted = {
    ...state,
    version: 1,
    suggestions,
    unreadCount: countUnhandledProactive(suggestions),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.proactiveSuggestions, JSON.stringify(payload));
}
