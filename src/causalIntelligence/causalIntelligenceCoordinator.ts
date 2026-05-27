/**
 * Runtime Causal Intelligence — deterministic attribution only (no AI/LLM/policy changes).
 */
import type {
  CausalGraphSnapshot,
  CausalIntelligenceDashboard,
  CausalIntelligenceObserveInput,
  CausalIntelligenceProfile,
} from '../types/runtimeCausalIntelligence';
import {
  CAUSAL_INTELLIGENCE_POLL_MS,
  CAUSAL_INTELLIGENCE_UI_JA,
} from '../constants/runtimeCausalIntelligence';
import {
  buildBaseCausalNodes,
  resetRuntimeCausalGraphCoordinatorForTest,
  setLastCausalGraph,
} from './runtimeCausalGraphCoordinator';
import { identifyRootCauseCandidates, resetFailureAttributionEngineForTest, scoreRootCause } from './failureAttributionEngine';
import { computePropagationDepth, getDependencyEdges, resetRuntimeEventDependencyTrackerForTest } from './runtimeEventDependencyTracker';
import { resetCausalChainReconstructionForTest, reconstructCausalChain } from './causalChainReconstruction';
import { resetRecoveryRootCauseAnalyzerForTest, analyzeRecoveryRootCause, scoreRecoveryAttribution } from './recoveryRootCauseAnalyzer';
import { resetThermalCausalityTrackerForTest, scoreThermalCausality } from './thermalCausalityTracker';
import { resetBridgeCongestionAttributionForTest, scoreBridgeCausality } from './bridgeCongestionAttribution';
import { resetWebsocketInstabilityAttributionForTest, scoreWebsocketInstability } from './websocketInstabilityAttribution';
import { resetRenderCascadeAnalyzerForTest, scoreCascadeSeverity } from './renderCascadeAnalyzer';
import {
  buildObserverNodes,
  resetObserverInteractionGraphForTest,
  scoreObserverInteractionCost,
  getObserverInteractionEdges,
} from './observerInteractionGraph';
import { buildPropagationEdges, resetRuntimePressurePropagationTrackerForTest, propagationFlowLabels } from './runtimePressurePropagationTracker';
import { resetGovernanceDecisionAttributionForTest, scoreGovernanceAttribution } from './governanceDecisionAttribution';
import { resetRecoveryEffectivenessCausalityForTest } from './recoveryEffectivenessCausality';
import { computeCausalDrift, resetLongSessionDegradationGraphForTest } from './longSessionDegradationGraph';
import { resetRuntimeAnomalyClusteringForTest, scoreAnomalyCluster } from './runtimeAnomalyClustering';
import { resetCausalConfidenceScorerForTest, scoreCausalConfidence } from './causalConfidenceScorer';
import { resetMultiFactorFailureMergerForTest } from './multiFactorFailureMerger';
import { computeRuntimeCorrelationStrength, resetTimelineCorrelationEngineForTest } from './timelineCorrelationEngine';
import { recordIncidentGraph, resetRuntimeIncidentReplayGraphForTest, scoreReplayConsistency } from './runtimeIncidentReplayGraph';
import {
  getCausalTimelineRecent,
  getSurvivabilityCausalityEvolution,
  noteSurvivabilityCausalScore,
  resetSurvivabilityCausalityTimelineForTest,
  scoreSurvivabilityCausal,
} from './survivabilityCausalityTimeline';
import { runCausalIntelligenceFlows } from './causalIntelligenceOrchestrator';
import {
  recordCausalIntelligenceSoakEvent,
  resetCausalIntelligenceSoakIntegrationForTest,
  setCausalIntelligenceSoakHook,
} from './causalIntelligenceSoakIntegration';

let lastProfile: CausalIntelligenceProfile | null = null;
let lastGraph: CausalGraphSnapshot | null = null;
let lastChain: string[] = [];
let lastRecoveryPath: string[] = [];
let lastPropagationFlow: string[] = [];
let lastThrottleAt = 0;

export function resetCausalIntelligenceForTest(): void {
  lastProfile = null;
  lastGraph = null;
  lastChain = [];
  lastRecoveryPath = [];
  lastPropagationFlow = [];
  lastThrottleAt = 0;
  resetRuntimeCausalGraphCoordinatorForTest();
  resetFailureAttributionEngineForTest();
  resetRuntimeEventDependencyTrackerForTest();
  resetCausalChainReconstructionForTest();
  resetRecoveryRootCauseAnalyzerForTest();
  resetThermalCausalityTrackerForTest();
  resetBridgeCongestionAttributionForTest();
  resetWebsocketInstabilityAttributionForTest();
  resetRenderCascadeAnalyzerForTest();
  resetObserverInteractionGraphForTest();
  resetRuntimePressurePropagationTrackerForTest();
  resetGovernanceDecisionAttributionForTest();
  resetRecoveryEffectivenessCausalityForTest();
  resetLongSessionDegradationGraphForTest();
  resetRuntimeAnomalyClusteringForTest();
  resetCausalConfidenceScorerForTest();
  resetMultiFactorFailureMergerForTest();
  resetTimelineCorrelationEngineForTest();
  resetRuntimeIncidentReplayGraphForTest();
  resetSurvivabilityCausalityTimelineForTest();
  resetCausalIntelligenceSoakIntegrationForTest();
}

export function initCausalIntelligence(): void {
  lastThrottleAt = 0;
}

export function setCausalIntelligenceSoakHookEnabled(enabled: boolean): void {
  setCausalIntelligenceSoakHook(enabled);
}

export function shouldRunCausalIntelligenceSample(
  _input: CausalIntelligenceObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < CAUSAL_INTELLIGENCE_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

function assembleGraph(input: CausalIntelligenceObserveInput): CausalGraphSnapshot {
  const baseNodes = buildBaseCausalNodes(input);
  const observerNodes = buildObserverNodes(input.observerOverheadRatio);
  const propagation = buildPropagationEdges(input);
  const interaction = getObserverInteractionEdges();
  const dependency = getDependencyEdges();
  const edges = [...propagation, ...interaction, ...dependency].slice(-48);
  return {
    nodes: [...baseNodes, ...observerNodes],
    edges,
    measuredAt: new Date().toISOString(),
  };
}

export function observeCausalIntelligence(input: CausalIntelligenceObserveInput): CausalIntelligenceProfile {
  runCausalIntelligenceFlows(input);
  for (const entry of getCausalTimelineRecent(5)) {
    recordCausalIntelligenceSoakEvent(entry);
  }

  const candidates = identifyRootCauseCandidates(input);
  const correlation = computeRuntimeCorrelationStrength();
  const rootCause = scoreRootCause(candidates);
  const graph = assembleGraph(input);
  setLastCausalGraph(graph);
  recordIncidentGraph(graph);

  lastChain = reconstructCausalChain(input);
  lastRecoveryPath = analyzeRecoveryRootCause(input);
  lastPropagationFlow = propagationFlowLabels(buildPropagationEdges(input));
  lastGraph = graph;

  const survivabilityCausal = scoreSurvivabilityCausal(
    input.runtimeSafeTradingScore,
    correlation,
    rootCause,
  );

  const profile: CausalIntelligenceProfile = {
    causalConfidence: scoreCausalConfidence(input, candidates, correlation),
    rootCauseScore: rootCause,
    propagationDepth: computePropagationDepth(),
    cascadeSeverity: scoreCascadeSeverity(input),
    recoveryAttribution: scoreRecoveryAttribution(input),
    thermalCausalityScore: scoreThermalCausality(input),
    bridgeCausalityScore: scoreBridgeCausality(input),
    websocketInstabilityScore: scoreWebsocketInstability(input),
    observerInteractionCost: scoreObserverInteractionCost(
      input.observerOverheadRatio,
      graph.edges.length,
    ),
    governanceAttribution: scoreGovernanceAttribution(input),
    runtimeCorrelationStrength: correlation,
    anomalyClusterScore: scoreAnomalyCluster(),
    replayConsistency: scoreReplayConsistency(),
    causalDrift: computeCausalDrift(),
    survivabilityCausalScore: survivabilityCausal,
    measuredAt: new Date().toISOString(),
  };

  noteSurvivabilityCausalScore(survivabilityCausal);
  lastProfile = profile;
  return profile;
}

export function getLastCausalIntelligenceProfile(): CausalIntelligenceProfile | null {
  return lastProfile;
}

export function getLastCausalGraphSnapshot(): CausalGraphSnapshot | null {
  return lastGraph;
}

export function getCausalIntelligenceDashboard(): CausalIntelligenceDashboard | null {
  if (!lastProfile || !lastGraph) return null;
  return {
    titleJa: CAUSAL_INTELLIGENCE_UI_JA.sectionTitle,
    safetyBannerJa: CAUSAL_INTELLIGENCE_UI_JA.safety,
    profile: lastProfile,
    graph: lastGraph,
    recentChain: lastChain,
    recoveryPath: lastRecoveryPath,
    propagationFlow: lastPropagationFlow,
    timelineRecent: getCausalTimelineRecent(6),
  };
}

export { getSurvivabilityCausalityEvolution };
