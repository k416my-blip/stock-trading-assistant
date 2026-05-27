/**
 * Runtime Inter-Civilization Resonance & Ontology Collision Stability — observe-only.
 */
import {
  RUNTIME_INTER_CIVILIZATION_POLL_MS,
  RUNTIME_INTER_CIVILIZATION_UI_JA,
} from '../constants/runtimeInterCivilizationResonance';
import type {
  RuntimeInterCivilizationDashboard,
  RuntimeInterCivilizationObserveInput,
  RuntimeInterCivilizationProfile,
} from '../types/runtimeInterCivilizationResonance';
import { buildRuntimeInterCivilizationProfile } from './interCivilizationScorers';
import { runInterCivilizationFlows } from './interCivilizationOrchestrator';
import {
  getInterCivilizationSuggestionsRecent,
  recordInterCivilizationSuggestions,
  resetInterCivilizationSuggestionRecorderForTest,
} from './interCivilizationSuggestionRecorder';
import {
  getInterCivilizationTimelineRecent,
  resetInterCivilizationTimelineForTest,
} from './interCivilizationTimeline';
import {
  buildCivilizationResonanceTopology,
  buildCivilizationSynchronizationTimeline,
  buildObserverInterferenceHeatmap,
  buildOntologyCollisionGraph,
  buildOntologyPartitionTopology,
  buildRecursiveResonanceCascadeGraph,
  buildSemanticPluralityMonitor,
  buildWorldviewDivergenceRadar,
} from './interCivilizationVisualizations';
import {
  recordInterCivilizationSoakEvent,
  resetInterCivilizationSoakIntegrationForTest,
  setInterCivilizationSoakHook,
} from './interCivilizationSoakIntegration';

let lastProfile: RuntimeInterCivilizationProfile | null = null;
let lastResonanceTopology: ReturnType<typeof buildCivilizationResonanceTopology> | null = null;
let lastCollisionGraph: ReturnType<typeof buildOntologyCollisionGraph> | null = null;
let lastDivergenceRadar: { axis: string; value: number }[] = [];
let lastInterferenceHeatmap: { layer: string; interference: number }[] = [];
let synchronizationTimeline: { at: string; synchronization: number }[] = [];
let lastPluralityMonitor: { label: string; value: number }[] = [];
let lastPartitionTopology: ReturnType<typeof buildOntologyPartitionTopology> | null = null;
let lastCascadeGraph: ReturnType<typeof buildRecursiveResonanceCascadeGraph> | null = null;
let lastThrottleAt = 0;

export function resetRuntimeInterCivilizationForTest(): void {
  lastProfile = null;
  lastResonanceTopology = null;
  lastCollisionGraph = null;
  lastDivergenceRadar = [];
  lastInterferenceHeatmap = [];
  synchronizationTimeline = [];
  lastPluralityMonitor = [];
  lastPartitionTopology = null;
  lastCascadeGraph = null;
  lastThrottleAt = 0;
  resetInterCivilizationTimelineForTest();
  resetInterCivilizationSoakIntegrationForTest();
  resetInterCivilizationSuggestionRecorderForTest();
}

export function initRuntimeInterCivilization(): void {
  lastThrottleAt = 0;
}

export function setRuntimeInterCivilizationSoakHookEnabled(enabled: boolean): void {
  setInterCivilizationSoakHook(enabled);
}

export function shouldRunRuntimeInterCivilizationSample(
  _input: RuntimeInterCivilizationObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_INTER_CIVILIZATION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeInterCivilization(
  input: RuntimeInterCivilizationObserveInput,
): RuntimeInterCivilizationProfile {
  runInterCivilizationFlows(input);
  for (const entry of getInterCivilizationTimelineRecent(5)) {
    recordInterCivilizationSoakEvent(entry);
  }
  const profile = buildRuntimeInterCivilizationProfile(input);
  recordInterCivilizationSuggestions(profile);
  lastResonanceTopology = buildCivilizationResonanceTopology(profile);
  lastCollisionGraph = buildOntologyCollisionGraph(profile);
  lastDivergenceRadar = buildWorldviewDivergenceRadar(profile);
  lastInterferenceHeatmap = buildObserverInterferenceHeatmap(profile);
  synchronizationTimeline = buildCivilizationSynchronizationTimeline(profile, synchronizationTimeline);
  lastPluralityMonitor = buildSemanticPluralityMonitor(profile);
  lastPartitionTopology = buildOntologyPartitionTopology(profile);
  lastCascadeGraph = buildRecursiveResonanceCascadeGraph(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeInterCivilizationProfile(): RuntimeInterCivilizationProfile | null {
  return lastProfile;
}

export function getRuntimeInterCivilizationDashboard(): RuntimeInterCivilizationDashboard | null {
  if (!lastProfile || !lastResonanceTopology || !lastCollisionGraph || !lastPartitionTopology || !lastCascadeGraph) {
    return null;
  }
  return {
    titleJa: RUNTIME_INTER_CIVILIZATION_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_INTER_CIVILIZATION_UI_JA.safety,
    profile: lastProfile,
    civilizationResonanceTopology: lastResonanceTopology,
    ontologyCollisionGraph: lastCollisionGraph,
    worldviewDivergenceRadar: lastDivergenceRadar,
    observerInterferenceHeatmap: lastInterferenceHeatmap,
    civilizationSynchronizationTimeline: [...synchronizationTimeline],
    semanticPluralityMonitor: lastPluralityMonitor,
    ontologyPartitionTopology: lastPartitionTopology,
    recursiveResonanceCascadeGraph: lastCascadeGraph,
    suggestions: getInterCivilizationSuggestionsRecent(8),
    timelineRecent: getInterCivilizationTimelineRecent(6),
  };
}

export function getRuntimeInterCivilizationSuggestions(): ReturnType<typeof getInterCivilizationSuggestionsRecent> {
  return getInterCivilizationSuggestionsRecent(12);
}
