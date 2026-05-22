import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { NARRATIVE_HISTORY_MAX } from '../constants/semanticConsistencyDecisionCoherence';

export type SemanticNarrativePersisted = {
  version: 1;
  lastSummaryJa: string | null;
  lastFinalDecision: string | null;
  narrativeHistory: Array<{ at: string; summaryJa: string; decision: string }>;
};

export function defaultSemanticNarrativeState(): SemanticNarrativePersisted {
  return {
    version: 1,
    lastSummaryJa: null,
    lastFinalDecision: null,
    narrativeHistory: [],
  };
}

export async function loadSemanticNarrativeState(): Promise<SemanticNarrativePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.semanticConsistencyDecisionCoherence);
    if (!raw) return defaultSemanticNarrativeState();
    const parsed = JSON.parse(raw) as Partial<SemanticNarrativePersisted>;
    return {
      version: 1,
      lastSummaryJa: typeof parsed.lastSummaryJa === 'string' ? parsed.lastSummaryJa : null,
      lastFinalDecision:
        typeof parsed.lastFinalDecision === 'string' ? parsed.lastFinalDecision : null,
      narrativeHistory: Array.isArray(parsed.narrativeHistory)
        ? parsed.narrativeHistory.slice(-NARRATIVE_HISTORY_MAX)
        : [],
    };
  } catch {
    return defaultSemanticNarrativeState();
  }
}

export async function saveSemanticNarrativeState(state: SemanticNarrativePersisted): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.semanticConsistencyDecisionCoherence,
    JSON.stringify(state),
  );
}

export async function appendNarrativeHistory(
  summaryJa: string,
  decision: string,
): Promise<string | null> {
  const state = await loadSemanticNarrativeState();
  const prev = state.lastSummaryJa;
  state.narrativeHistory.push({
    at: new Date().toISOString(),
    summaryJa: summaryJa.slice(0, 500),
    decision,
  });
  state.narrativeHistory = state.narrativeHistory.slice(-NARRATIVE_HISTORY_MAX);
  state.lastSummaryJa = summaryJa.slice(0, 500);
  state.lastFinalDecision = decision;
  await saveSemanticNarrativeState(state);
  if (!prev) return null;
  return prev === summaryJa ? null : `前回: ${prev.slice(0, 80)}… → 今回: ${summaryJa.slice(0, 80)}…`;
}
