import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { CONSENSUS_TIMELINE_MAX } from '../constants/cognitiveArbitrationConsensus';
import type {
  ConsensusState,
  ConsensusTimelinePoint,
} from '../types/cognitiveArbitrationConsensus';

export type CognitiveArbitrationPersisted = {
  version: 1;
  lastConsensusState: ConsensusState;
  lastOrchestrationBudgetMax: number;
  lastContradictionRiskPct: number;
  consensusTimeline: ConsensusTimelinePoint[];
  debounceUntil: string | null;
};

export function defaultCognitiveArbitrationState(): CognitiveArbitrationPersisted {
  return {
    version: 1,
    lastConsensusState: 'CONSENSUS_OK',
    lastOrchestrationBudgetMax: 85,
    lastContradictionRiskPct: 0,
    consensusTimeline: [],
    debounceUntil: null,
  };
}

export async function loadCognitiveArbitrationState(): Promise<CognitiveArbitrationPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.cognitiveArbitrationConsensus);
    if (!raw) return defaultCognitiveArbitrationState();
    const parsed = JSON.parse(raw) as Partial<CognitiveArbitrationPersisted>;
    return {
      version: 1,
      lastConsensusState: (parsed.lastConsensusState as ConsensusState) ?? 'CONSENSUS_OK',
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 85,
      lastContradictionRiskPct:
        typeof parsed.lastContradictionRiskPct === 'number' ? parsed.lastContradictionRiskPct : 0,
      consensusTimeline: Array.isArray(parsed.consensusTimeline)
        ? parsed.consensusTimeline.slice(-CONSENSUS_TIMELINE_MAX)
        : [],
      debounceUntil:
        typeof parsed.debounceUntil === 'string' ? parsed.debounceUntil : null,
    };
  } catch {
    return defaultCognitiveArbitrationState();
  }
}

export async function saveCognitiveArbitrationState(
  state: CognitiveArbitrationPersisted,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.cognitiveArbitrationConsensus, JSON.stringify(state));
}

export async function appendConsensusTimelinePoint(
  point: ConsensusTimelinePoint,
): Promise<void> {
  const state = await loadCognitiveArbitrationState();
  state.consensusTimeline.push(point);
  state.consensusTimeline = state.consensusTimeline.slice(-CONSENSUS_TIMELINE_MAX);
  state.lastConsensusState = point.state;
  state.lastContradictionRiskPct = point.contradictionRiskPct;
  await saveCognitiveArbitrationState(state);
}
