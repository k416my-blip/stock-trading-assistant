/**
 * Runtime Semantic Compression & Metric Canonicalization — observe-only.
 */
import type {
  RuntimeSemanticCompressionDashboard,
  RuntimeSemanticCompressionObserveInput,
  RuntimeSemanticCompressionProfile,
} from '../types/runtimeSemanticCompression';
import {
  RUNTIME_SEMANTIC_COMPRESSION_POLL_MS,
  RUNTIME_SEMANTIC_COMPRESSION_UI_JA,
} from '../constants/runtimeSemanticCompression';
import { buildRuntimeSemanticCompressionProfile } from './semanticCompressionScorers';
import {
  getSemanticCompressionSuggestionsRecent,
  recordSemanticCompressionSuggestions,
  resetSemanticCompressionSuggestionRecorderForTest,
} from './semanticCompressionSuggestionRecorder';
import {
  buildCanonicalMetricGraph,
  buildCompressionPressureTimeline,
  buildMetricFamilyTopology,
  buildObserverDependencyGraph,
  buildSemanticOverlapHeatmap,
  buildSemanticRedundancyRadar,
} from './semanticCompressionVisualizations';
import { runSemanticCompressionFlows } from './semanticCompressionOrchestrator';
import {
  getSemanticCompressionTimelineRecent,
  resetSemanticCompressionTimelineForTest,
} from './semanticCompressionTimeline';
import {
  recordSemanticCompressionSoakEvent,
  resetSemanticCompressionSoakIntegrationForTest,
  setSemanticCompressionSoakHook,
} from './semanticCompressionSoakIntegration';

let lastProfile: RuntimeSemanticCompressionProfile | null = null;
let lastHeatmap: { layer: string; overlap: number }[] = [];
let lastCanonicalGraph: ReturnType<typeof buildCanonicalMetricGraph> | null = null;
let lastFamilyTopology: ReturnType<typeof buildMetricFamilyTopology> | null = null;
let lastRadar: { axis: string; value: number }[] = [];
let lastObserverGraph: ReturnType<typeof buildObserverDependencyGraph> | null = null;
let pressureTimeline: { at: string; pressure: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeSemanticCompressionForTest(): void {
  lastProfile = null;
  lastHeatmap = [];
  lastCanonicalGraph = null;
  lastFamilyTopology = null;
  lastRadar = [];
  lastObserverGraph = null;
  pressureTimeline = [];
  lastThrottleAt = 0;
  resetSemanticCompressionTimelineForTest();
  resetSemanticCompressionSoakIntegrationForTest();
  resetSemanticCompressionSuggestionRecorderForTest();
}

export function initRuntimeSemanticCompression(): void {
  lastThrottleAt = 0;
}

export function setRuntimeSemanticCompressionSoakHookEnabled(enabled: boolean): void {
  setSemanticCompressionSoakHook(enabled);
}

export function shouldRunRuntimeSemanticCompressionSample(
  _input: RuntimeSemanticCompressionObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_SEMANTIC_COMPRESSION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeSemanticCompression(
  input: RuntimeSemanticCompressionObserveInput,
): RuntimeSemanticCompressionProfile {
  runSemanticCompressionFlows(input);
  for (const entry of getSemanticCompressionTimelineRecent(5)) {
    recordSemanticCompressionSoakEvent(entry);
  }

  const profile = buildRuntimeSemanticCompressionProfile(input);
  recordSemanticCompressionSuggestions(profile);
  lastHeatmap = buildSemanticOverlapHeatmap(input, profile);
  lastCanonicalGraph = buildCanonicalMetricGraph(profile);
  lastFamilyTopology = buildMetricFamilyTopology(profile);
  lastRadar = buildSemanticRedundancyRadar(profile);
  lastObserverGraph = buildObserverDependencyGraph(profile);
  pressureTimeline = buildCompressionPressureTimeline(profile, pressureTimeline);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeSemanticCompressionProfile(): RuntimeSemanticCompressionProfile | null {
  return lastProfile;
}

export function getRuntimeSemanticCompressionDashboard(): RuntimeSemanticCompressionDashboard | null {
  if (!lastProfile || !lastCanonicalGraph || !lastFamilyTopology || !lastObserverGraph) return null;
  return {
    titleJa: RUNTIME_SEMANTIC_COMPRESSION_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_SEMANTIC_COMPRESSION_UI_JA.safety,
    profile: lastProfile,
    semanticOverlapHeatmap: lastHeatmap,
    canonicalMetricGraph: lastCanonicalGraph,
    metricFamilyTopology: lastFamilyTopology,
    semanticRedundancyRadar: lastRadar,
    observerDependencyGraph: lastObserverGraph,
    compressionPressureTimeline: [...pressureTimeline],
    suggestions: getSemanticCompressionSuggestionsRecent(8),
    timelineRecent: getSemanticCompressionTimelineRecent(6),
  };
}

export function getRuntimeSemanticCompressionSuggestions(): ReturnType<typeof getSemanticCompressionSuggestionsRecent> {
  return getSemanticCompressionSuggestionsRecent(12);
}
