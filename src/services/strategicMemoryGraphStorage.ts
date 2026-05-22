import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { GRAPH_TIMELINE_MAX } from '../constants/strategicMemoryGraphTemporalCausality';
import type {
  CausalEdgeSnapshot,
  GraphTimelinePoint,
  GraphStructureState,
} from '../types/strategicMemoryGraphTemporalCausality';

export type StrategicMemoryGraphPersisted = {
  version: 1;
  lastGraphState: GraphStructureState;
  lastGraphHealthPct: number;
  lastOrchestrationBudgetMax: number;
  graphTimeline: GraphTimelinePoint[];
  lastEdgeCount: number;
  refreshCount: number;
  compressedEdges: CausalEdgeSnapshot[];
};

export function defaultStrategicMemoryGraphState(): StrategicMemoryGraphPersisted {
  return {
    version: 1,
    lastGraphState: 'GRAPH_STABLE',
    lastGraphHealthPct: 78,
    lastOrchestrationBudgetMax: 86,
    graphTimeline: [],
    lastEdgeCount: 0,
    refreshCount: 0,
    compressedEdges: [],
  };
}

export async function loadStrategicMemoryGraphState(): Promise<StrategicMemoryGraphPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.strategicMemoryGraphTemporalCausality);
    if (!raw) return defaultStrategicMemoryGraphState();
    const parsed = JSON.parse(raw) as Partial<StrategicMemoryGraphPersisted>;
    return {
      version: 1,
      lastGraphState: (parsed.lastGraphState as GraphStructureState) ?? 'GRAPH_STABLE',
      lastGraphHealthPct:
        typeof parsed.lastGraphHealthPct === 'number' ? parsed.lastGraphHealthPct : 78,
      lastOrchestrationBudgetMax:
        typeof parsed.lastOrchestrationBudgetMax === 'number'
          ? parsed.lastOrchestrationBudgetMax
          : 86,
      graphTimeline: Array.isArray(parsed.graphTimeline)
        ? parsed.graphTimeline.slice(-GRAPH_TIMELINE_MAX)
        : [],
      lastEdgeCount: typeof parsed.lastEdgeCount === 'number' ? parsed.lastEdgeCount : 0,
      refreshCount: typeof parsed.refreshCount === 'number' ? parsed.refreshCount : 0,
      compressedEdges: Array.isArray(parsed.compressedEdges) ? parsed.compressedEdges : [],
    };
  } catch {
    return defaultStrategicMemoryGraphState();
  }
}

export async function saveStrategicMemoryGraphState(
  state: StrategicMemoryGraphPersisted,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.strategicMemoryGraphTemporalCausality,
    JSON.stringify(state),
  );
}

export async function appendGraphSnapshot(
  point: GraphTimelinePoint,
  edges: CausalEdgeSnapshot[],
): Promise<StrategicMemoryGraphPersisted> {
  const state = await loadStrategicMemoryGraphState();
  state.graphTimeline.push(point);
  state.graphTimeline = state.graphTimeline.slice(-GRAPH_TIMELINE_MAX);
  state.lastGraphState = point.graphState;
  state.lastGraphHealthPct = point.graphHealthPct;
  state.lastEdgeCount = point.edgeCount;
  state.compressedEdges = edges.slice(-24);
  state.refreshCount += 1;
  await saveStrategicMemoryGraphState(state);
  return state;
}
