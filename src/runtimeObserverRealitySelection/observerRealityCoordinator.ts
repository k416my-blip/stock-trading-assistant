/**
 * Runtime Observer Reality Selection & Semantic Causality Drift — observe-only.
 */
import {
  RUNTIME_OBSERVER_REALITY_POLL_MS,
  RUNTIME_OBSERVER_REALITY_UI_JA,
} from '../constants/runtimeObserverRealitySelection';
import type {
  RuntimeObserverRealityDashboard,
  RuntimeObserverRealityObserveInput,
  RuntimeObserverRealityProfile,
} from '../types/runtimeObserverRealitySelection';
import { buildRuntimeObserverRealityProfile } from './observerRealityScorers';
import { runObserverRealityFlows } from './observerRealityOrchestrator';
import {
  getObserverRealitySuggestionsRecent,
  recordObserverRealitySuggestions,
  resetObserverRealitySuggestionRecorderForTest,
} from './observerRealitySuggestionRecorder';
import {
  getObserverRealityTimelineRecent,
  resetObserverRealityTimelineForTest,
} from './observerRealityTimeline';
import {
  buildCausalityDriftTopology,
  buildNarrativeRealityCouplingHeatmap,
  buildObserverFixationMonitor,
  buildRealitySelectionTopology,
  buildRecursiveInterpretationTree,
  buildSemanticBranchingTimeline,
  buildSemanticCausalityGraph,
  buildWorldviewDivergenceRadar,
} from './observerRealityVisualizations';
import {
  recordObserverRealitySoakEvent,
  resetObserverRealitySoakIntegrationForTest,
  setObserverRealitySoakHook,
} from './observerRealitySoakIntegration';

let lastProfile: RuntimeObserverRealityProfile | null = null;
let lastRealityTopology: ReturnType<typeof buildRealitySelectionTopology> | null = null;
let lastCausalityGraph: ReturnType<typeof buildSemanticCausalityGraph> | null = null;
let lastInterpretationTree: ReturnType<typeof buildRecursiveInterpretationTree> | null = null;
let lastDivergenceRadar: { axis: string; value: number }[] = [];
let lastCouplingHeatmap: { layer: string; coupling: number }[] = [];
let lastFixationMonitor: { label: string; value: number }[] = [];
let semanticBranchingTimeline: { at: string; branching: number }[] = [];
let lastCausalityTopology: ReturnType<typeof buildCausalityDriftTopology> | null = null;
let lastThrottleAt = 0;

export function resetRuntimeObserverRealityForTest(): void {
  lastProfile = null;
  lastRealityTopology = null;
  lastCausalityGraph = null;
  lastInterpretationTree = null;
  lastDivergenceRadar = [];
  lastCouplingHeatmap = [];
  lastFixationMonitor = [];
  semanticBranchingTimeline = [];
  lastCausalityTopology = null;
  lastThrottleAt = 0;
  resetObserverRealityTimelineForTest();
  resetObserverRealitySoakIntegrationForTest();
  resetObserverRealitySuggestionRecorderForTest();
}

export function initRuntimeObserverReality(): void {
  lastThrottleAt = 0;
}

export function setRuntimeObserverRealitySoakHookEnabled(enabled: boolean): void {
  setObserverRealitySoakHook(enabled);
}

export function shouldRunRuntimeObserverRealitySample(
  _input: RuntimeObserverRealityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_OBSERVER_REALITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeObserverReality(
  input: RuntimeObserverRealityObserveInput,
): RuntimeObserverRealityProfile {
  runObserverRealityFlows(input);
  for (const entry of getObserverRealityTimelineRecent(5)) {
    recordObserverRealitySoakEvent(entry);
  }
  const profile = buildRuntimeObserverRealityProfile(input);
  recordObserverRealitySuggestions(profile);
  lastRealityTopology = buildRealitySelectionTopology(profile);
  lastCausalityGraph = buildSemanticCausalityGraph(profile);
  lastInterpretationTree = buildRecursiveInterpretationTree(profile);
  lastDivergenceRadar = buildWorldviewDivergenceRadar(profile);
  lastCouplingHeatmap = buildNarrativeRealityCouplingHeatmap(profile);
  lastFixationMonitor = buildObserverFixationMonitor(profile);
  semanticBranchingTimeline = buildSemanticBranchingTimeline(profile, semanticBranchingTimeline);
  lastCausalityTopology = buildCausalityDriftTopology(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeObserverRealityProfile(): RuntimeObserverRealityProfile | null {
  return lastProfile;
}

export function getRuntimeObserverRealityDashboard(): RuntimeObserverRealityDashboard | null {
  if (!lastProfile || !lastRealityTopology || !lastCausalityGraph || !lastInterpretationTree || !lastCausalityTopology) {
    return null;
  }
  return {
    titleJa: RUNTIME_OBSERVER_REALITY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_OBSERVER_REALITY_UI_JA.safety,
    profile: lastProfile,
    realitySelectionTopology: lastRealityTopology,
    semanticCausalityGraph: lastCausalityGraph,
    recursiveInterpretationTree: lastInterpretationTree,
    worldviewDivergenceRadar: lastDivergenceRadar,
    narrativeRealityCouplingHeatmap: lastCouplingHeatmap,
    observerFixationMonitor: lastFixationMonitor,
    semanticBranchingTimeline: [...semanticBranchingTimeline],
    causalityDriftTopology: lastCausalityTopology,
    suggestions: getObserverRealitySuggestionsRecent(8),
    timelineRecent: getObserverRealityTimelineRecent(6),
  };
}

export function getRuntimeObserverRealitySuggestions(): ReturnType<typeof getObserverRealitySuggestionsRecent> {
  return getObserverRealitySuggestionsRecent(12);
}
