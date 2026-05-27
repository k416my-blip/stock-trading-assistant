/**
 * Runtime Meta-Limit Governance & Recursive Boundary Stability — observe-only.
 */
import type {
  RuntimeMetaLimitDashboard,
  RuntimeMetaLimitObserveInput,
  RuntimeMetaLimitProfile,
} from '../types/runtimeMetaLimitGovernance';
import { RUNTIME_META_LIMIT_POLL_MS, RUNTIME_META_LIMIT_UI_JA } from '../constants/runtimeMetaLimitGovernance';
import { buildRuntimeMetaLimitProfile } from './metaLimitScorers';
import {
  getMetaLimitSuggestionsByKind,
  getMetaLimitSuggestionsRecent,
  recordMetaLimitSuggestions,
  resetMetaLimitSuggestionRecorderForTest,
} from './metaLimitSuggestionRecorder';
import {
  buildBoundednessStabilityGauge,
  buildMonitoringExpansionTimeline,
  buildObserverDepthLadder,
  buildRecursionBoundaryGraph,
  buildSemanticInfinityRadar,
  buildTopologySelfReferenceMap,
} from './metaLimitVisualizations';
import { runMetaLimitFlows } from './metaLimitOrchestrator';
import { getMetaLimitTimelineRecent, resetMetaLimitTimelineForTest } from './metaLimitTimeline';
import {
  recordMetaLimitSoakEvent,
  resetMetaLimitSoakIntegrationForTest,
  setMetaLimitSoakHook,
} from './metaLimitSoakIntegration';

let lastProfile: RuntimeMetaLimitProfile | null = null;
let lastBoundaryGraph: ReturnType<typeof buildRecursionBoundaryGraph> | null = null;
let lastTopologyMap: ReturnType<typeof buildTopologySelfReferenceMap> | null = null;
let lastObserverLadder: { rung: string; depth: number }[] = [];
let monitoringTimeline: { at: string; level: number }[] = [];
let lastInfinityRadar: { axis: string; value: number }[] = [];
let lastGauge: { label: string; value: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeMetaLimitForTest(): void {
  lastProfile = null;
  lastBoundaryGraph = null;
  lastTopologyMap = null;
  lastObserverLadder = [];
  monitoringTimeline = [];
  lastInfinityRadar = [];
  lastGauge = [];
  lastThrottleAt = 0;
  resetMetaLimitTimelineForTest();
  resetMetaLimitSoakIntegrationForTest();
  resetMetaLimitSuggestionRecorderForTest();
}

export function initRuntimeMetaLimit(): void {
  lastThrottleAt = 0;
}

export function setRuntimeMetaLimitSoakHookEnabled(enabled: boolean): void {
  setMetaLimitSoakHook(enabled);
}

export function shouldRunRuntimeMetaLimitSample(
  _input: RuntimeMetaLimitObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_META_LIMIT_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeMetaLimit(input: RuntimeMetaLimitObserveInput): RuntimeMetaLimitProfile {
  runMetaLimitFlows(input);
  for (const entry of getMetaLimitTimelineRecent(5)) {
    recordMetaLimitSoakEvent(entry);
  }

  const profile = buildRuntimeMetaLimitProfile(input);
  recordMetaLimitSuggestions(profile);
  lastBoundaryGraph = buildRecursionBoundaryGraph(profile);
  lastTopologyMap = buildTopologySelfReferenceMap(profile);
  lastObserverLadder = buildObserverDepthLadder(profile);
  monitoringTimeline = buildMonitoringExpansionTimeline(profile, monitoringTimeline);
  lastInfinityRadar = buildSemanticInfinityRadar(profile);
  lastGauge = buildBoundednessStabilityGauge(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeMetaLimitProfile(): RuntimeMetaLimitProfile | null {
  return lastProfile;
}

export function getRuntimeMetaLimitDashboard(): RuntimeMetaLimitDashboard | null {
  if (!lastProfile || !lastBoundaryGraph || !lastTopologyMap) return null;
  return {
    titleJa: RUNTIME_META_LIMIT_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_META_LIMIT_UI_JA.safety,
    profile: lastProfile,
    recursionBoundaryGraph: lastBoundaryGraph,
    observerDepthLadder: lastObserverLadder,
    monitoringExpansionTimeline: [...monitoringTimeline],
    semanticInfinityRadar: lastInfinityRadar,
    topologySelfReferenceMap: lastTopologyMap,
    boundednessStabilityGauge: lastGauge,
    recursionBoundarySuggestions: getMetaLimitSuggestionsByKind('recursion_boundary'),
    monitoringExpansionWarnings: getMetaLimitSuggestionsByKind('monitoring_expansion'),
    semanticInfinityAlerts: getMetaLimitSuggestionsByKind('semantic_infinity'),
    observerTerminationHints: getMetaLimitSuggestionsByKind('observer_termination'),
    topologyBoundaryDriftWarnings: getMetaLimitSuggestionsByKind('topology_boundary_drift'),
    timelineRecent: getMetaLimitTimelineRecent(6),
  };
}

export function getRuntimeMetaLimitSuggestions(): ReturnType<typeof getMetaLimitSuggestionsRecent> {
  return getMetaLimitSuggestionsRecent(12);
}
