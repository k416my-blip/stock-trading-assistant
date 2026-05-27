/**
 * Runtime Civilizational Cognition Topology & Epistemic Stability — observe-only.
 */
import type {
  RuntimeCivilizationTopologyDashboard,
  RuntimeCivilizationTopologyObserveInput,
  RuntimeCivilizationTopologyProfile,
} from '../types/runtimeCivilizationTopology';
import {
  RUNTIME_CIVILIZATION_TOPOLOGY_POLL_MS,
  RUNTIME_CIVILIZATION_TOPOLOGY_UI_JA,
} from '../constants/runtimeCivilizationTopology';
import { buildCivilizationTopologyProfile } from './civilizationTopologyScorers';
import {
  getEpistemicSuggestionsByKind,
  getEpistemicSuggestionsRecent,
  recordEpistemicTopologySuggestions,
  resetEpistemicSuggestionRecorderForTest,
} from './epistemicSuggestionRecorder';
import {
  buildCognitionTopologyGraph,
  buildEpistemicStabilityRadar,
  buildGovernanceWorldviewLadder,
  buildObserverChainMap,
  buildRealityCouplingGraph,
  buildRecursiveMeaningTopology,
  buildSemanticCivilizationHeatmap,
} from './civilizationTopologyVisualizations';
import { runCivilizationTopologyFlows } from './civilizationTopologyOrchestrator';
import {
  getCivilizationTopologyTimelineRecent,
  resetCivilizationTopologyTimelineForTest,
} from './civilizationTopologyTimeline';
import {
  recordCivilizationTopologySoakEvent,
  resetCivilizationTopologySoakIntegrationForTest,
  setCivilizationTopologySoakHook,
} from './civilizationTopologySoakIntegration';

let lastProfile: RuntimeCivilizationTopologyProfile | null = null;
let lastCognitionGraph: ReturnType<typeof buildCognitionTopologyGraph> | null = null;
let lastObserverChainMap: ReturnType<typeof buildObserverChainMap> | null = null;
let lastRecursiveMeaningGraph: ReturnType<typeof buildRecursiveMeaningTopology> | null = null;
let lastRealityCouplingGraph: ReturnType<typeof buildRealityCouplingGraph> | null = null;
let lastRadar: { axis: string; value: number }[] = [];
let lastHeatmap: { layer: string; intensity: number }[] = [];
let lastLadder: { rung: string; drift: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeCivilizationTopologyForTest(): void {
  lastProfile = null;
  lastCognitionGraph = null;
  lastObserverChainMap = null;
  lastRecursiveMeaningGraph = null;
  lastRealityCouplingGraph = null;
  lastRadar = [];
  lastHeatmap = [];
  lastLadder = [];
  lastThrottleAt = 0;
  resetCivilizationTopologyTimelineForTest();
  resetCivilizationTopologySoakIntegrationForTest();
  resetEpistemicSuggestionRecorderForTest();
}

export function initRuntimeCivilizationTopology(): void {
  lastThrottleAt = 0;
}

export function setRuntimeCivilizationTopologySoakHookEnabled(enabled: boolean): void {
  setCivilizationTopologySoakHook(enabled);
}

export function shouldRunRuntimeCivilizationTopologySample(
  _input: RuntimeCivilizationTopologyObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_CIVILIZATION_TOPOLOGY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeCivilizationTopology(
  input: RuntimeCivilizationTopologyObserveInput,
): RuntimeCivilizationTopologyProfile {
  runCivilizationTopologyFlows(input);
  for (const entry of getCivilizationTopologyTimelineRecent(5)) {
    recordCivilizationTopologySoakEvent(entry);
  }

  const profile = buildCivilizationTopologyProfile(input);
  recordEpistemicTopologySuggestions(profile);
  lastCognitionGraph = buildCognitionTopologyGraph(profile);
  lastObserverChainMap = buildObserverChainMap(profile);
  lastRecursiveMeaningGraph = buildRecursiveMeaningTopology(profile);
  lastRealityCouplingGraph = buildRealityCouplingGraph(profile);
  lastRadar = buildEpistemicStabilityRadar(profile);
  lastHeatmap = buildSemanticCivilizationHeatmap(input, profile);
  lastLadder = buildGovernanceWorldviewLadder(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeCivilizationTopologyProfile(): RuntimeCivilizationTopologyProfile | null {
  return lastProfile;
}

export function getRuntimeCivilizationTopologyDashboard(): RuntimeCivilizationTopologyDashboard | null {
  if (!lastProfile || !lastCognitionGraph || !lastObserverChainMap || !lastRecursiveMeaningGraph || !lastRealityCouplingGraph) {
    return null;
  }
  return {
    titleJa: RUNTIME_CIVILIZATION_TOPOLOGY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_CIVILIZATION_TOPOLOGY_UI_JA.safety,
    profile: lastProfile,
    cognitionTopologyGraph: lastCognitionGraph,
    epistemicStabilityRadar: lastRadar,
    observerChainMap: lastObserverChainMap,
    recursiveMeaningTopology: lastRecursiveMeaningGraph,
    semanticCivilizationHeatmap: lastHeatmap,
    governanceWorldviewLadder: lastLadder,
    realityCouplingGraph: lastRealityCouplingGraph,
    unstableBeliefSuggestions: getEpistemicSuggestionsByKind('unstable_belief'),
    recursiveNarrativeWarnings: getEpistemicSuggestionsByKind('recursive_narrative'),
    topologyDriftSuggestions: getEpistemicSuggestionsByKind('topology_drift'),
    governanceMeaningDivergence: getEpistemicSuggestionsByKind('governance_meaning_divergence'),
    observerPerspectiveAlerts: getEpistemicSuggestionsByKind('observer_perspective'),
    timelineRecent: getCivilizationTopologyTimelineRecent(6),
  };
}

export function getRuntimeCivilizationTopologySuggestions(): ReturnType<typeof getEpistemicSuggestionsRecent> {
  return getEpistemicSuggestionsRecent(12);
}
