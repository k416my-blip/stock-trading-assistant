import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ARCHITECTURE_TIMELINE_MAX } from '../constants/selfEvolvingArchitectureReflectiveRefactor';
import type {
  ArchitectureSnapshotPoint,
  ArchitectureStructureState,
} from '../types/selfEvolvingArchitectureReflectiveRefactor';

export type SelfArchitecturePersisted = {
  version: 1;
  lastStructureState: ArchitectureStructureState;
  lastArchitectureHealthPct: number;
  lastOrchestrationBudgetMax: number;
  architectureTimeline: ArchitectureSnapshotPoint[];
  pendingProposalCount: number;
  refreshCount: number;
};

export function defaultSelfArchitectureState(): SelfArchitecturePersisted {
  return {
    version: 1,
    lastStructureState: 'ARCH_STABLE',
    lastArchitectureHealthPct: 78,
    lastOrchestrationBudgetMax: 88,
    architectureTimeline: [],
    pendingProposalCount: 0,
    refreshCount: 0,
  };
}

export async function loadSelfArchitectureState(): Promise<SelfArchitecturePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.selfEvolvingArchitectureReflectiveRefactor);
    if (!raw) return defaultSelfArchitectureState();
    const parsed = JSON.parse(raw) as Partial<SelfArchitecturePersisted>;
    return {
      version: 1,
      lastStructureState:
        (parsed.lastStructureState as ArchitectureStructureState) ?? 'ARCH_STABLE',
      lastArchitectureHealthPct:
        typeof parsed.lastArchitectureHealthPct === 'number'
          ? parsed.lastArchitectureHealthPct
          : 78,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 88,
      architectureTimeline: Array.isArray(parsed.architectureTimeline)
        ? parsed.architectureTimeline.slice(-ARCHITECTURE_TIMELINE_MAX)
        : [],
      pendingProposalCount:
        typeof parsed.pendingProposalCount === 'number' ? parsed.pendingProposalCount : 0,
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
    };
  } catch {
    return defaultSelfArchitectureState();
  }
}

export async function saveSelfArchitectureState(state: SelfArchitecturePersisted): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.selfEvolvingArchitectureReflectiveRefactor,
    JSON.stringify(state),
  );
}

export async function appendArchitectureSnapshot(
  point: ArchitectureSnapshotPoint,
  proposalCount: number,
): Promise<SelfArchitecturePersisted> {
  const state = await loadSelfArchitectureState();
  state.architectureTimeline.push(point);
  state.architectureTimeline = state.architectureTimeline.slice(-ARCHITECTURE_TIMELINE_MAX);
  state.lastStructureState = point.structureState;
  state.lastArchitectureHealthPct = point.architectureHealthPct;
  state.pendingProposalCount = proposalCount;
  state.refreshCount += 1;
  await saveSelfArchitectureState(state);
  return state;
}
