import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { CONSTITUTIONAL_TIMELINE_MAX } from '../constants/constitutionalGovernanceSystemCoherence';
import type {
  ConstitutionalState,
  ConstitutionalTimelinePoint,
} from '../types/constitutionalGovernanceSystemCoherence';

export type ConstitutionalGovernancePersisted = {
  version: 1;
  lastConstitutionalState: ConstitutionalState;
  lastConstitutionalHealthPct: number;
  lastOrchestrationBudgetMax: number;
  constitutionalTimeline: ConstitutionalTimelinePoint[];
  lastConflictPressurePct: number;
  refreshCount: number;
};

export function defaultConstitutionalGovernanceState(): ConstitutionalGovernancePersisted {
  return {
    version: 1,
    lastConstitutionalState: 'CONSTITUTIONAL_STABLE',
    lastConstitutionalHealthPct: 78,
    lastOrchestrationBudgetMax: 88,
    constitutionalTimeline: [],
    lastConflictPressurePct: 28,
    refreshCount: 0,
  };
}

export async function loadConstitutionalGovernanceState(): Promise<ConstitutionalGovernancePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.constitutionalGovernanceSystemCoherence);
    if (!raw) return defaultConstitutionalGovernanceState();
    const parsed = JSON.parse(raw) as Partial<ConstitutionalGovernancePersisted>;
    return {
      version: 1,
      lastConstitutionalState:
        (parsed.lastConstitutionalState as ConstitutionalState) ?? 'CONSTITUTIONAL_STABLE',
      lastConstitutionalHealthPct:
        typeof parsed.lastConstitutionalHealthPct === 'number'
          ? parsed.lastConstitutionalHealthPct
          : 78,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 88,
      constitutionalTimeline: Array.isArray(parsed.constitutionalTimeline)
        ? parsed.constitutionalTimeline.slice(-CONSTITUTIONAL_TIMELINE_MAX)
        : [],
      lastConflictPressurePct:
        typeof parsed.lastConflictPressurePct === 'number'
          ? parsed.lastConflictPressurePct
          : 28,
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultConstitutionalGovernanceState();
  }
}

export async function saveConstitutionalGovernanceState(
  state: ConstitutionalGovernancePersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.constitutionalGovernanceSystemCoherence,
    JSON.stringify(state),
  );
}

export async function appendConstitutionalSnapshot(
  point: ConstitutionalTimelinePoint,
  conflictPressurePct: number,
): Promise<ConstitutionalGovernancePersisted> {
  const state = await loadConstitutionalGovernanceState();
  state.constitutionalTimeline.push(point);
  state.constitutionalTimeline = state.constitutionalTimeline.slice(-CONSTITUTIONAL_TIMELINE_MAX);
  state.lastConstitutionalState = point.constitutionalState;
  state.lastConstitutionalHealthPct = point.constitutionalHealthPct;
  state.lastConflictPressurePct = conflictPressurePct;
  state.refreshCount += 1;
  await saveConstitutionalGovernanceState(state);
  return state;
}
