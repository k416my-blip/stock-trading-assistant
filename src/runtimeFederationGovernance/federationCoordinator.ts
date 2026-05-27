/**
 * Runtime Federation Governance & Cross-Layer Compression — observe-only.
 */
import type {
  RuntimeFederationDashboard,
  RuntimeFederationObserveInput,
  RuntimeFederationProfile,
} from '../types/runtimeFederationGovernance';
import { RUNTIME_FEDERATION_POLL_MS, RUNTIME_FEDERATION_UI_JA } from '../constants/runtimeFederationGovernance';
import { buildRuntimeFederationProfile } from './federationScorers';
import {
  getFederationSuggestionsRecent,
  recordFederationSuggestions,
  resetFederationSuggestionRecorderForTest,
} from './federationSuggestionRecorder';
import {
  buildCivilizationLayerAggregationMap,
  buildCrossLayerCausalGraph,
  buildFederationSaturationRadar,
  buildFederationStabilityTimeline,
  buildGovernanceHierarchyLadder,
  buildMetricRedundancyHeatmap,
  buildObserverDependencyMatrix,
  buildStackCompressionGauge,
  buildStackFederationMap,
  buildTelemetryFederationGraph,
} from './federationVisualizations';
import { runFederationFlows } from './federationOrchestrator';
import { getFederationTimelineRecent, resetFederationTimelineForTest } from './federationTimeline';
import {
  recordFederationSoakEvent,
  resetFederationSoakIntegrationForTest,
  setFederationSoakHook,
} from './federationSoakIntegration';

let lastProfile: RuntimeFederationProfile | null = null;
let lastCausalGraph: ReturnType<typeof buildCrossLayerCausalGraph> | null = null;
let lastStackMap: ReturnType<typeof buildStackFederationMap> | null = null;
let lastTelemetryGraph: ReturnType<typeof buildTelemetryFederationGraph> | null = null;
let lastAggregationMap: ReturnType<typeof buildCivilizationLayerAggregationMap> | null = null;
let lastRadar: { axis: string; value: number }[] = [];
let lastHeatmap: { metric: string; redundancy: number }[] = [];
let lastMatrix: { observer: string; dependencies: number; risk: number }[] = [];
let lastGauge: { label: string; value: number }[] = [];
let stabilityTimeline: { at: string; level: number }[] = [];
let lastLadder: { rung: string; stability: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeFederationForTest(): void {
  lastProfile = null;
  lastCausalGraph = null;
  lastStackMap = null;
  lastTelemetryGraph = null;
  lastAggregationMap = null;
  lastRadar = [];
  lastHeatmap = [];
  lastMatrix = [];
  lastGauge = [];
  stabilityTimeline = [];
  lastLadder = [];
  lastThrottleAt = 0;
  resetFederationTimelineForTest();
  resetFederationSoakIntegrationForTest();
  resetFederationSuggestionRecorderForTest();
}

export function initRuntimeFederation(): void {
  lastThrottleAt = 0;
}

export function setRuntimeFederationSoakHookEnabled(enabled: boolean): void {
  setFederationSoakHook(enabled);
}

export function shouldRunRuntimeFederationSample(
  _input: RuntimeFederationObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_FEDERATION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeFederation(input: RuntimeFederationObserveInput): RuntimeFederationProfile {
  runFederationFlows(input);
  for (const entry of getFederationTimelineRecent(5)) {
    recordFederationSoakEvent(entry);
  }

  const profile = buildRuntimeFederationProfile(input);
  recordFederationSuggestions(profile);
  lastCausalGraph = buildCrossLayerCausalGraph(profile);
  lastStackMap = buildStackFederationMap(profile);
  lastTelemetryGraph = buildTelemetryFederationGraph(profile);
  lastAggregationMap = buildCivilizationLayerAggregationMap(profile);
  lastRadar = buildFederationSaturationRadar(profile);
  lastHeatmap = buildMetricRedundancyHeatmap(input, profile);
  lastMatrix = buildObserverDependencyMatrix(input, profile);
  lastGauge = buildStackCompressionGauge(profile);
  stabilityTimeline = buildFederationStabilityTimeline(profile, stabilityTimeline);
  lastLadder = buildGovernanceHierarchyLadder(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeFederationProfile(): RuntimeFederationProfile | null {
  return lastProfile;
}

export function getRuntimeFederationDashboard(): RuntimeFederationDashboard | null {
  if (!lastProfile || !lastCausalGraph || !lastStackMap || !lastTelemetryGraph || !lastAggregationMap) return null;
  return {
    titleJa: RUNTIME_FEDERATION_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_FEDERATION_UI_JA.safety,
    profile: lastProfile,
    crossLayerCausalGraph: lastCausalGraph,
    federationSaturationRadar: lastRadar,
    metricRedundancyHeatmap: lastHeatmap,
    observerDependencyMatrix: lastMatrix,
    stackCompressionGauge: lastGauge,
    federationStabilityTimeline: [...stabilityTimeline],
    stackFederationMap: lastStackMap,
    governanceHierarchyLadder: lastLadder,
    telemetryFederationGraph: lastTelemetryGraph,
    civilizationLayerAggregationMap: lastAggregationMap,
    suggestions: getFederationSuggestionsRecent(8),
    timelineRecent: getFederationTimelineRecent(6),
  };
}

export function getRuntimeFederationSuggestions(): ReturnType<typeof getFederationSuggestionsRecent> {
  return getFederationSuggestionsRecent(12);
}
