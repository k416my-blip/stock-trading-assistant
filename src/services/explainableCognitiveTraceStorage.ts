import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ConfidenceEvolutionPoint, CognitiveTraceReplayEntry } from '../types/explainableCognitiveTrace';
import type { StrategyAction } from '../types/strategyExecution';

export type CognitiveTracePersisted = {
  version: 1;
  confidenceHistory: ConfidenceEvolutionPoint[];
  replayTimeline: CognitiveTraceReplayEntry[];
  lastRecommendations: Array<{ symbol: string; action: StrategyAction }>;
  lastExplainableScore: number | null;
  contradictionHistory: Array<{ at: string; detailJa: string }>;
  recentReasonHashes: string[];
};

export function defaultCognitiveTraceState(): CognitiveTracePersisted {
  return {
    version: 1,
    confidenceHistory: [],
    replayTimeline: [],
    lastRecommendations: [],
    lastExplainableScore: null,
    contradictionHistory: [],
    recentReasonHashes: [],
  };
}

export async function loadCognitiveTraceState(): Promise<CognitiveTracePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.explainableCognitiveTrace);
    if (!raw) return defaultCognitiveTraceState();
    const parsed = JSON.parse(raw) as Partial<CognitiveTracePersisted>;
    return {
      version: 1,
      confidenceHistory: Array.isArray(parsed.confidenceHistory)
        ? parsed.confidenceHistory.slice(-120)
        : [],
      replayTimeline: Array.isArray(parsed.replayTimeline) ? parsed.replayTimeline.slice(-40) : [],
      lastRecommendations: Array.isArray(parsed.lastRecommendations)
        ? parsed.lastRecommendations.slice(-30)
        : [],
      lastExplainableScore:
        typeof parsed.lastExplainableScore === 'number' ? parsed.lastExplainableScore : null,
      contradictionHistory: Array.isArray(parsed.contradictionHistory)
        ? parsed.contradictionHistory.slice(-30)
        : [],
      recentReasonHashes: Array.isArray(parsed.recentReasonHashes)
        ? parsed.recentReasonHashes.slice(-20)
        : [],
    };
  } catch {
    return defaultCognitiveTraceState();
  }
}

export async function saveCognitiveTraceState(state: CognitiveTracePersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.explainableCognitiveTrace, JSON.stringify(state));
}

export async function appendCognitiveTraceReplay(entry: CognitiveTraceReplayEntry): Promise<void> {
  const state = await loadCognitiveTraceState();
  state.replayTimeline.push(entry);
  state.replayTimeline = state.replayTimeline.slice(-40);
  await saveCognitiveTraceState(state);
}
