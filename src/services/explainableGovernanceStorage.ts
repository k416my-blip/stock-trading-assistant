import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { EXPLAINABLE_TIMELINE_MAX } from '../constants/explainableGovernanceTransparentReasoning';
import type {
  ExplainableState,
  ExplainableTimelinePoint,
} from '../types/explainableGovernanceTransparentReasoning';

export type ExplainableGovernancePersisted = {
  version: 1;
  lastExplainableState: ExplainableState;
  lastExplainabilityHealthPct: number;
  lastOrchestrationBudgetMax: number;
  explainableTimeline: ExplainableTimelinePoint[];
  lastTransparencyScorePct: number;
  refreshCount: number;
};

export function defaultExplainableGovernanceState(): ExplainableGovernancePersisted {
  return {
    version: 1,
    lastExplainableState: 'EXPLAINABLE_OK',
    lastExplainabilityHealthPct: 80,
    lastOrchestrationBudgetMax: 90,
    explainableTimeline: [],
    lastTransparencyScorePct: 75,
    refreshCount: 0,
  };
}

export async function loadExplainableGovernanceState(): Promise<ExplainableGovernancePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.explainableGovernanceTransparentReasoning);
    if (!raw) return defaultExplainableGovernanceState();
    const parsed = JSON.parse(raw) as Partial<ExplainableGovernancePersisted>;
    return {
      version: 1,
      lastExplainableState:
        (parsed.lastExplainableState as ExplainableState) ?? 'EXPLAINABLE_OK',
      lastExplainabilityHealthPct:
        typeof parsed.lastExplainabilityHealthPct === 'number'
          ? parsed.lastExplainabilityHealthPct
          : 80,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 90,
      explainableTimeline: Array.isArray(parsed.explainableTimeline)
        ? parsed.explainableTimeline.slice(-EXPLAINABLE_TIMELINE_MAX)
        : [],
      lastTransparencyScorePct:
        typeof parsed.lastTransparencyScorePct === 'number'
          ? parsed.lastTransparencyScorePct
          : 75,
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultExplainableGovernanceState();
  }
}

export async function saveExplainableGovernanceState(
  state: ExplainableGovernancePersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.explainableGovernanceTransparentReasoning,
    JSON.stringify(state),
  );
}

export async function appendExplainableSnapshot(
  point: ExplainableTimelinePoint,
  transparencyScorePct: number,
): Promise<ExplainableGovernancePersisted> {
  const state = await loadExplainableGovernanceState();
  state.explainableTimeline.push(point);
  state.explainableTimeline = state.explainableTimeline.slice(-EXPLAINABLE_TIMELINE_MAX);
  state.lastExplainableState = point.explainableState;
  state.lastExplainabilityHealthPct = point.explainabilityHealthPct;
  state.lastTransparencyScorePct = transparencyScorePct;
  state.refreshCount += 1;
  await saveExplainableGovernanceState(state);
  return state;
}
