/**
 * Runtime Cognitive Load Shedding & Adaptive Observation Routing — observe-only.
 */
import {
  RUNTIME_ADAPTIVE_OBSERVATION_POLL_MS,
  RUNTIME_ADAPTIVE_OBSERVATION_UI_JA,
} from '../constants/runtimeAdaptiveObservation';
import type {
  RuntimeAdaptiveObservationDashboard,
  RuntimeAdaptiveObservationObserveInput,
  RuntimeAdaptiveObservationProfile,
} from '../types/runtimeAdaptiveObservation';
import { buildRuntimeAdaptiveObservationProfile } from './adaptiveObservationScorers';
import { runAdaptiveObservationFlows } from './adaptiveObservationOrchestrator';
import {
  getAdaptiveObservationSuggestionsRecent,
  recordAdaptiveObservationSuggestions,
  resetAdaptiveObservationSuggestionRecorderForTest,
} from './adaptiveObservationSuggestionRecorder';
import {
  getAdaptiveObservationTimelineRecent,
  resetAdaptiveObservationTimelineForTest,
} from './adaptiveObservationTimeline';
import {
  buildDashboardOverloadMonitor,
  buildObservationPressureHeatmap,
  buildObservationQueueVisualization,
  buildObserverAttentionRadar,
  buildRecursiveSignalTopology,
  buildSemanticHotPathGraph,
  buildSemanticRoutingMap,
  buildTelemetryCongestionTimeline,
} from './adaptiveObservationVisualizations';
import {
  recordAdaptiveObservationSoakEvent,
  resetAdaptiveObservationSoakIntegrationForTest,
  setAdaptiveObservationSoakHook,
} from './adaptiveObservationSoakIntegration';

let lastProfile: RuntimeAdaptiveObservationProfile | null = null;
let lastPressureHeatmap: { layer: string; pressure: number }[] = [];
let lastHotPathGraph: ReturnType<typeof buildSemanticHotPathGraph> | null = null;
let lastAttentionRadar: { axis: string; value: number }[] = [];
let telemetryCongestionTimeline: { at: string; congestion: number }[] = [];
let lastSignalTopology: ReturnType<typeof buildRecursiveSignalTopology> | null = null;
let lastOverloadMonitor: { label: string; value: number }[] = [];
let lastRoutingMap: ReturnType<typeof buildSemanticRoutingMap> | null = null;
let lastQueueVisualization: { queue: string; depth: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeAdaptiveObservationForTest(): void {
  lastProfile = null;
  lastPressureHeatmap = [];
  lastHotPathGraph = null;
  lastAttentionRadar = [];
  telemetryCongestionTimeline = [];
  lastSignalTopology = null;
  lastOverloadMonitor = [];
  lastRoutingMap = null;
  lastQueueVisualization = [];
  lastThrottleAt = 0;
  resetAdaptiveObservationTimelineForTest();
  resetAdaptiveObservationSoakIntegrationForTest();
  resetAdaptiveObservationSuggestionRecorderForTest();
}

export function initRuntimeAdaptiveObservation(): void {
  lastThrottleAt = 0;
}

export function setRuntimeAdaptiveObservationSoakHookEnabled(enabled: boolean): void {
  setAdaptiveObservationSoakHook(enabled);
}

export function shouldRunRuntimeAdaptiveObservationSample(
  _input: RuntimeAdaptiveObservationObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_ADAPTIVE_OBSERVATION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeAdaptiveObservation(
  input: RuntimeAdaptiveObservationObserveInput,
): RuntimeAdaptiveObservationProfile {
  runAdaptiveObservationFlows(input);
  for (const entry of getAdaptiveObservationTimelineRecent(5)) {
    recordAdaptiveObservationSoakEvent(entry);
  }
  const profile = buildRuntimeAdaptiveObservationProfile(input);
  recordAdaptiveObservationSuggestions(profile);
  lastPressureHeatmap = buildObservationPressureHeatmap(profile);
  lastHotPathGraph = buildSemanticHotPathGraph(profile);
  lastAttentionRadar = buildObserverAttentionRadar(profile);
  telemetryCongestionTimeline = buildTelemetryCongestionTimeline(profile, telemetryCongestionTimeline);
  lastSignalTopology = buildRecursiveSignalTopology(profile);
  lastOverloadMonitor = buildDashboardOverloadMonitor(profile);
  lastRoutingMap = buildSemanticRoutingMap(profile);
  lastQueueVisualization = buildObservationQueueVisualization(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeAdaptiveObservationProfile(): RuntimeAdaptiveObservationProfile | null {
  return lastProfile;
}

export function getRuntimeAdaptiveObservationDashboard(): RuntimeAdaptiveObservationDashboard | null {
  if (!lastProfile || !lastHotPathGraph || !lastSignalTopology || !lastRoutingMap) return null;
  return {
    titleJa: RUNTIME_ADAPTIVE_OBSERVATION_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_ADAPTIVE_OBSERVATION_UI_JA.safety,
    profile: lastProfile,
    observationPressureHeatmap: lastPressureHeatmap,
    semanticHotPathGraph: lastHotPathGraph,
    observerAttentionRadar: lastAttentionRadar,
    telemetryCongestionTimeline: [...telemetryCongestionTimeline],
    recursiveSignalTopology: lastSignalTopology,
    dashboardOverloadMonitor: lastOverloadMonitor,
    semanticRoutingMap: lastRoutingMap,
    observationQueueVisualization: lastQueueVisualization,
    suggestions: getAdaptiveObservationSuggestionsRecent(8),
    timelineRecent: getAdaptiveObservationTimelineRecent(6),
  };
}

export function getRuntimeAdaptiveObservationSuggestions(): ReturnType<typeof getAdaptiveObservationSuggestionsRecent> {
  return getAdaptiveObservationSuggestionsRecent(12);
}
