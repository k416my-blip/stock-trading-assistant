/**
 * Runtime Semantic Gravity & Anchor Divergence Stability — observe-only.
 */
import type {
  RuntimeSemanticGravityDashboard,
  RuntimeSemanticGravityObserveInput,
  RuntimeSemanticGravityProfile,
} from '../types/runtimeSemanticGravity';
import {
  RUNTIME_SEMANTIC_GRAVITY_POLL_MS,
  RUNTIME_SEMANTIC_GRAVITY_UI_JA,
} from '../constants/runtimeSemanticGravity';
import { buildRuntimeSemanticGravityProfile } from './semanticGravityScorers';
import {
  getSemanticGravityWarningsRecent,
  recordSemanticGravityWarnings,
  resetSemanticGravityWarningRecorderForTest,
} from './semanticGravityWarningRecorder';
import {
  buildAnchorDivergenceTopology,
  buildCanonicalAttractionHeatmap,
  buildObserverBeliefClusteringMap,
  buildOntologyCentralizationRadar,
  buildSemanticEquilibriumTimeline,
  buildSemanticGravityFieldMap,
  buildSemanticPluralityGraph,
} from './semanticGravityVisualizations';
import { runSemanticGravityFlows } from './semanticGravityOrchestrator';
import {
  getSemanticGravityTimelineRecent,
  resetSemanticGravityTimelineForTest,
} from './semanticGravityTimeline';
import {
  recordSemanticGravitySoakEvent,
  resetSemanticGravitySoakIntegrationForTest,
  setSemanticGravitySoakHook,
} from './semanticGravitySoakIntegration';

let lastProfile: RuntimeSemanticGravityProfile | null = null;
let lastGravityMap: ReturnType<typeof buildSemanticGravityFieldMap> | null = null;
let lastAnchorTopology: ReturnType<typeof buildAnchorDivergenceTopology> | null = null;
let lastCentralizationRadar: { axis: string; value: number }[] = [];
let lastAttractionHeatmap: { layer: string; attraction: number }[] = [];
let lastPluralityGraph: ReturnType<typeof buildSemanticPluralityGraph> | null = null;
let lastBeliefMap: ReturnType<typeof buildObserverBeliefClusteringMap> | null = null;
let equilibriumTimeline: { at: string; equilibrium: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeSemanticGravityForTest(): void {
  lastProfile = null;
  lastGravityMap = null;
  lastAnchorTopology = null;
  lastCentralizationRadar = [];
  lastAttractionHeatmap = [];
  lastPluralityGraph = null;
  lastBeliefMap = null;
  equilibriumTimeline = [];
  lastThrottleAt = 0;
  resetSemanticGravityTimelineForTest();
  resetSemanticGravitySoakIntegrationForTest();
  resetSemanticGravityWarningRecorderForTest();
}

export function initRuntimeSemanticGravity(): void {
  lastThrottleAt = 0;
}

export function setRuntimeSemanticGravitySoakHookEnabled(enabled: boolean): void {
  setSemanticGravitySoakHook(enabled);
}

export function shouldRunRuntimeSemanticGravitySample(
  _input: RuntimeSemanticGravityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_SEMANTIC_GRAVITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeSemanticGravity(
  input: RuntimeSemanticGravityObserveInput,
): RuntimeSemanticGravityProfile {
  runSemanticGravityFlows(input);
  for (const entry of getSemanticGravityTimelineRecent(5)) {
    recordSemanticGravitySoakEvent(entry);
  }

  const profile = buildRuntimeSemanticGravityProfile(input);
  recordSemanticGravityWarnings(profile);
  lastGravityMap = buildSemanticGravityFieldMap(profile);
  lastAnchorTopology = buildAnchorDivergenceTopology(profile);
  lastCentralizationRadar = buildOntologyCentralizationRadar(profile);
  lastAttractionHeatmap = buildCanonicalAttractionHeatmap(profile);
  lastPluralityGraph = buildSemanticPluralityGraph(profile);
  lastBeliefMap = buildObserverBeliefClusteringMap(profile);
  equilibriumTimeline = buildSemanticEquilibriumTimeline(profile, equilibriumTimeline);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeSemanticGravityProfile(): RuntimeSemanticGravityProfile | null {
  return lastProfile;
}

export function getRuntimeSemanticGravityDashboard(): RuntimeSemanticGravityDashboard | null {
  if (!lastProfile || !lastGravityMap || !lastAnchorTopology || !lastPluralityGraph || !lastBeliefMap) return null;
  return {
    titleJa: RUNTIME_SEMANTIC_GRAVITY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_SEMANTIC_GRAVITY_UI_JA.safety,
    profile: lastProfile,
    semanticGravityFieldMap: lastGravityMap,
    anchorDivergenceTopology: lastAnchorTopology,
    ontologyCentralizationRadar: lastCentralizationRadar,
    canonicalAttractionHeatmap: lastAttractionHeatmap,
    semanticPluralityGraph: lastPluralityGraph,
    observerBeliefClusteringMap: lastBeliefMap,
    semanticEquilibriumTimeline: [...equilibriumTimeline],
    warnings: getSemanticGravityWarningsRecent(8),
    timelineRecent: getSemanticGravityTimelineRecent(6),
  };
}

export function getRuntimeSemanticGravityWarnings(): ReturnType<typeof getSemanticGravityWarningsRecent> {
  return getSemanticGravityWarningsRecent(12);
}
