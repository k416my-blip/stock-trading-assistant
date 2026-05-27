/**
 * Runtime Ontology Stabilization & Semantic Reality Anchoring — observe-only.
 */
import type {
  RuntimeOntologyDashboard,
  RuntimeOntologyObserveInput,
  RuntimeOntologyProfile,
} from '../types/runtimeOntologyStabilization';
import { RUNTIME_ONTOLOGY_POLL_MS, RUNTIME_ONTOLOGY_UI_JA } from '../constants/runtimeOntologyStabilization';
import { buildRuntimeOntologyProfile } from './ontologyScorers';
import {
  getOntologyWarningsRecent,
  recordOntologyWarnings,
  resetOntologyWarningRecorderForTest,
} from './ontologyWarningRecorder';
import {
  buildNarrativeRealityDivergenceGraph,
  buildOntologyStabilityRadar,
  buildObserverReferenceTopology,
  buildRealityAnchorGraph,
  buildRealityAnchorMap,
  buildRecursiveMeaningLadder,
  buildSemanticGroundingGraph,
  buildSemanticGroundingHeatmap,
  buildSymbolicDriftTimeline,
} from './ontologyVisualizations';
import { runOntologyFlows } from './ontologyOrchestrator';
import { getOntologyTimelineRecent, resetOntologyTimelineForTest } from './ontologyTimeline';
import {
  recordOntologySoakEvent,
  resetOntologySoakIntegrationForTest,
  setOntologySoakHook,
} from './ontologySoakIntegration';

let lastProfile: RuntimeOntologyProfile | null = null;
let lastAnchorGraph: ReturnType<typeof buildRealityAnchorGraph> | null = null;
let lastObserverTopology: ReturnType<typeof buildObserverReferenceTopology> | null = null;
let lastAnchorMap: ReturnType<typeof buildRealityAnchorMap> | null = null;
let lastGroundingGraph: ReturnType<typeof buildSemanticGroundingGraph> | null = null;
let lastDivergenceGraph: ReturnType<typeof buildNarrativeRealityDivergenceGraph> | null = null;
let lastRadar: { axis: string; value: number }[] = [];
let lastHeatmap: { layer: string; grounding: number }[] = [];
let lastLadder: { rung: string; depth: number }[] = [];
let symbolicDriftTimeline: { at: string; level: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeOntologyForTest(): void {
  lastProfile = null;
  lastAnchorGraph = null;
  lastObserverTopology = null;
  lastAnchorMap = null;
  lastGroundingGraph = null;
  lastDivergenceGraph = null;
  lastRadar = [];
  lastHeatmap = [];
  lastLadder = [];
  symbolicDriftTimeline = [];
  lastThrottleAt = 0;
  resetOntologyTimelineForTest();
  resetOntologySoakIntegrationForTest();
  resetOntologyWarningRecorderForTest();
}

export function initRuntimeOntology(): void {
  lastThrottleAt = 0;
}

export function setRuntimeOntologySoakHookEnabled(enabled: boolean): void {
  setOntologySoakHook(enabled);
}

export function shouldRunRuntimeOntologySample(
  _input: RuntimeOntologyObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_ONTOLOGY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeOntology(input: RuntimeOntologyObserveInput): RuntimeOntologyProfile {
  runOntologyFlows(input);
  for (const entry of getOntologyTimelineRecent(5)) {
    recordOntologySoakEvent(entry);
  }

  const profile = buildRuntimeOntologyProfile(input);
  recordOntologyWarnings(profile);
  lastAnchorGraph = buildRealityAnchorGraph(profile);
  lastObserverTopology = buildObserverReferenceTopology(profile);
  lastAnchorMap = buildRealityAnchorMap(profile);
  lastGroundingGraph = buildSemanticGroundingGraph(profile);
  lastDivergenceGraph = buildNarrativeRealityDivergenceGraph(profile);
  lastRadar = buildOntologyStabilityRadar(profile);
  lastHeatmap = buildSemanticGroundingHeatmap(input, profile);
  lastLadder = buildRecursiveMeaningLadder(profile);
  symbolicDriftTimeline = buildSymbolicDriftTimeline(profile, symbolicDriftTimeline);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeOntologyProfile(): RuntimeOntologyProfile | null {
  return lastProfile;
}

export function getRuntimeOntologyDashboard(): RuntimeOntologyDashboard | null {
  if (!lastProfile || !lastAnchorGraph || !lastObserverTopology || !lastAnchorMap || !lastGroundingGraph || !lastDivergenceGraph) {
    return null;
  }
  return {
    titleJa: RUNTIME_ONTOLOGY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_ONTOLOGY_UI_JA.safety,
    profile: lastProfile,
    ontologyStabilityRadar: lastRadar,
    semanticGroundingHeatmap: lastHeatmap,
    realityAnchorGraph: lastAnchorGraph,
    observerReferenceTopology: lastObserverTopology,
    recursiveMeaningLadder: lastLadder,
    symbolicDriftTimeline: [...symbolicDriftTimeline],
    realityAnchorMap: lastAnchorMap,
    semanticGroundingGraph: lastGroundingGraph,
    narrativeRealityDivergenceGraph: lastDivergenceGraph,
    ontologyWarnings: getOntologyWarningsRecent(8),
    timelineRecent: getOntologyTimelineRecent(6),
  };
}

export function getRuntimeOntologyWarnings(): ReturnType<typeof getOntologyWarningsRecent> {
  return getOntologyWarningsRecent(12);
}
