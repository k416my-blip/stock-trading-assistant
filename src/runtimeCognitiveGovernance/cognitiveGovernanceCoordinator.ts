/**
 * Runtime Cognitive Governance & Semantic Signal Prioritization — observe-only.
 */
import type {
  RuntimeCognitiveGovernanceDashboard,
  RuntimeCognitiveGovernanceObserveInput,
  RuntimeCognitiveGovernanceProfile,
} from '../types/runtimeCognitiveGovernance';
import {
  RUNTIME_COGNITIVE_GOVERNANCE_POLL_MS,
  RUNTIME_COGNITIVE_GOVERNANCE_UI_JA,
} from '../constants/runtimeCognitiveGovernance';
import { buildCognitiveGovernanceProfile } from './cognitiveMetricScorers';
import {
  getSemanticSuggestionsByKind,
  getSemanticSuggestionsRecent,
  recordSemanticSignalSuggestions,
  resetSemanticSuggestionRecorderForTest,
} from './semanticSuggestionRecorder';
import {
  buildAttentionFragmentationRadar,
  buildCognitiveHeatmap,
  buildGovernanceAbstractionLadder,
  buildReplayComplexityTimeline,
  buildSemanticDensityGraph,
  buildSignalImportanceMap,
} from './cognitiveVisualizationBuilders';
import { runCognitiveGovernanceFlows } from './cognitiveGovernanceOrchestrator';
import {
  getCognitiveGovernanceTimelineRecent,
  resetCognitiveGovernanceTimelineForTest,
} from './cognitiveGovernanceTimeline';
import {
  recordCognitiveGovernanceSoakEvent,
  resetCognitiveGovernanceSoakIntegrationForTest,
  setCognitiveGovernanceSoakHook,
} from './cognitiveGovernanceSoakIntegration';

let lastProfile: RuntimeCognitiveGovernanceProfile | null = null;
let lastHeatmap: { layer: string; load: number }[] = [];
let lastSemanticGraph: ReturnType<typeof buildSemanticDensityGraph> | null = null;
let lastAttentionRadar: { axis: string; value: number }[] = [];
let replayComplexityTimeline: { at: string; level: number }[] = [];
let lastAbstractionLadder: { rung: string; depth: number }[] = [];
let lastImportanceMap: { signal: string; importance: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeCognitiveGovernanceForTest(): void {
  lastProfile = null;
  lastHeatmap = [];
  lastSemanticGraph = null;
  lastAttentionRadar = [];
  replayComplexityTimeline = [];
  lastAbstractionLadder = [];
  lastImportanceMap = [];
  lastThrottleAt = 0;
  resetCognitiveGovernanceTimelineForTest();
  resetCognitiveGovernanceSoakIntegrationForTest();
  resetSemanticSuggestionRecorderForTest();
}

export function initRuntimeCognitiveGovernance(): void {
  lastThrottleAt = 0;
}

export function setRuntimeCognitiveGovernanceSoakHookEnabled(enabled: boolean): void {
  setCognitiveGovernanceSoakHook(enabled);
}

export function shouldRunRuntimeCognitiveGovernanceSample(
  _input: RuntimeCognitiveGovernanceObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_COGNITIVE_GOVERNANCE_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeCognitiveGovernance(
  input: RuntimeCognitiveGovernanceObserveInput,
): RuntimeCognitiveGovernanceProfile {
  runCognitiveGovernanceFlows(input);
  for (const entry of getCognitiveGovernanceTimelineRecent(5)) {
    recordCognitiveGovernanceSoakEvent(entry);
  }

  const profile = buildCognitiveGovernanceProfile(input);
  recordSemanticSignalSuggestions(profile);
  lastHeatmap = buildCognitiveHeatmap(profile);
  lastSemanticGraph = buildSemanticDensityGraph(input, profile);
  lastAttentionRadar = buildAttentionFragmentationRadar(profile);
  replayComplexityTimeline = buildReplayComplexityTimeline(profile, replayComplexityTimeline);
  lastAbstractionLadder = buildGovernanceAbstractionLadder(profile);
  lastImportanceMap = buildSignalImportanceMap(input, profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeCognitiveGovernanceProfile(): RuntimeCognitiveGovernanceProfile | null {
  return lastProfile;
}

export function getRuntimeCognitiveGovernanceDashboard(): RuntimeCognitiveGovernanceDashboard | null {
  if (!lastProfile || !lastSemanticGraph) return null;
  return {
    titleJa: RUNTIME_COGNITIVE_GOVERNANCE_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_COGNITIVE_GOVERNANCE_UI_JA.safety,
    profile: lastProfile,
    cognitiveHeatmap: lastHeatmap,
    semanticDensityGraph: lastSemanticGraph,
    attentionFragmentationRadar: lastAttentionRadar,
    replayComplexityTimeline: [...replayComplexityTimeline],
    governanceAbstractionLadder: lastAbstractionLadder,
    signalImportanceMap: lastImportanceMap,
    criticalSignalSuggestions: getSemanticSuggestionsByKind('critical_signal'),
    lowValueSignalSuggestions: getSemanticSuggestionsByKind('low_value_signal'),
    redundantNarrativeSuggestions: getSemanticSuggestionsByKind('redundant_narrative'),
    dashboardSimplificationSuggestions: getSemanticSuggestionsByKind('dashboard_simplification'),
    replayCompressionSuggestions: getSemanticSuggestionsByKind('replay_compression'),
    timelineRecent: getCognitiveGovernanceTimelineRecent(6),
  };
}

export function getRuntimeCognitiveGovernanceSuggestions(): ReturnType<typeof getSemanticSuggestionsRecent> {
  return getSemanticSuggestionsRecent(12);
}
