/**
 * Meta Runtime Orchestration — survivability layer conflict resolution (no policy changes).
 */
import type {
  MetaInteractionGraph,
  MetaOrchestrationDashboard,
  MetaOrchestrationObserveInput,
  MetaOrchestrationProfile,
} from '../types/metaRuntimeOrchestration';
import {
  META_ORCHESTRATION_POLL_MS,
  META_ORCHESTRATION_UI_JA,
} from '../constants/metaRuntimeOrchestration';
import { computeOrchestrationPressure, computeMetaCoordinationStability, resetMetaOrchestratorCoordinatorForTest } from './metaOrchestratorCoordinator';
import { scoreSurvivabilityConflict, resetSurvivabilityConflictDetectorForTest } from './survivabilityConflictDetector';
import { resetRecoveryGovernanceArbitrationForTest } from './recoveryGovernanceArbitration';
import { resetObserverOverloadSuppressorForTest } from './observerOverloadSuppressor';
import { scoreTelemetryAmplification, resetTelemetryAmplificationLimiterForTest } from './telemetryAmplificationLimiter';
import { scoreRecoveryOscillationRisk, resetRecoveryOscillationDetectorForTest } from './recoveryOscillationDetector';
import { scoreGovernanceThrashRisk, resetGovernanceThrashingSuppressorForTest } from './governanceThrashingSuppressor';
import { scoreStabilizationDeadlockRisk, resetStabilizationDeadlockDetectorForTest } from './stabilizationDeadlockDetector';
import { computeInterventionDensity, resetRuntimeInterventionSchedulerForTest } from './runtimeInterventionScheduler';
import { resetPriorityAwareSurvivabilityQueueForTest } from './priorityAwareSurvivabilityQueue';
import { scoreCrossLayerPressure, resetCrossLayerPacingCoordinatorForTest } from './crossLayerPacingCoordinator';
import { resetMetaHysteresisControllerForTest } from './metaHysteresisController';
import { scoreObserverStarvationRisk, resetObserverStarvationPreventionForTest } from './observerStarvationPrevention';
import { scoreInterventionCooldownEfficiency, resetRuntimeInterventionCooldownManagerForTest } from './runtimeInterventionCooldownManager';
import { buildLayerInteractionHeatmap, buildInterventionHeatmap, getContentionMap, resetLayerInteractionHeatmapForTest } from './layerInteractionHeatmap';
import { scoreSurvivabilityContention, resetSurvivabilityContentionTrackerForTest } from './survivabilityContentionTracker';
import { resetRuntimeSelfInterferenceDetectorForTest } from './runtimeSelfInterferenceDetector';
import { scoreOrchestrationBalance, resetLongSessionOrchestrationBalancerForTest } from './longSessionOrchestrationBalancer';
import { scoreRuntimeFatigue, noteRuntimeFatigueScore, resetRuntimeFatigueCoordinatorForTest } from './runtimeFatigueCoordinator';
import { scoreEquilibrium, noteEquilibriumScore, resetGlobalSurvivabilityEquilibriumEngineForTest } from './globalSurvivabilityEquilibriumEngine';
import {
  getMetaOrchestrationTimelineRecent,
  getPacingTimelineRecent,
  resetMetaOrchestrationTimelineForTest,
} from './metaOrchestrationTimeline';
import { runMetaOrchestrationFlowsWithDensity } from './metaOrchestrationOrchestrator';
import {
  recordMetaOrchestrationSoakEvent,
  resetMetaOrchestrationSoakIntegrationForTest,
  setMetaOrchestrationSoakHook,
} from './metaOrchestrationSoakIntegration';

let lastProfile: MetaOrchestrationProfile | null = null;
let lastGraph: MetaInteractionGraph | null = null;
let lastHeatmap: Record<string, number> = {};
let lastThrottleAt = 0;

export function resetMetaOrchestrationForTest(): void {
  lastProfile = null;
  lastGraph = null;
  lastHeatmap = {};
  lastThrottleAt = 0;
  resetMetaOrchestratorCoordinatorForTest();
  resetSurvivabilityConflictDetectorForTest();
  resetRecoveryGovernanceArbitrationForTest();
  resetObserverOverloadSuppressorForTest();
  resetTelemetryAmplificationLimiterForTest();
  resetRecoveryOscillationDetectorForTest();
  resetGovernanceThrashingSuppressorForTest();
  resetStabilizationDeadlockDetectorForTest();
  resetRuntimeInterventionSchedulerForTest();
  resetPriorityAwareSurvivabilityQueueForTest();
  resetCrossLayerPacingCoordinatorForTest();
  resetMetaHysteresisControllerForTest();
  resetObserverStarvationPreventionForTest();
  resetRuntimeInterventionCooldownManagerForTest();
  resetLayerInteractionHeatmapForTest();
  resetSurvivabilityContentionTrackerForTest();
  resetRuntimeSelfInterferenceDetectorForTest();
  resetLongSessionOrchestrationBalancerForTest();
  resetRuntimeFatigueCoordinatorForTest();
  resetGlobalSurvivabilityEquilibriumEngineForTest();
  resetMetaOrchestrationTimelineForTest();
  resetMetaOrchestrationSoakIntegrationForTest();
}

export function initMetaOrchestration(): void {
  lastThrottleAt = 0;
}

export function setMetaOrchestrationSoakHookEnabled(enabled: boolean): void {
  setMetaOrchestrationSoakHook(enabled);
}

export function shouldRunMetaOrchestrationSample(
  _input: MetaOrchestrationObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < META_ORCHESTRATION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeMetaOrchestration(input: MetaOrchestrationObserveInput): MetaOrchestrationProfile {
  const interventionDensity = computeInterventionDensity();
  runMetaOrchestrationFlowsWithDensity(input, interventionDensity);
  for (const entry of getMetaOrchestrationTimelineRecent(5)) {
    recordMetaOrchestrationSoakEvent(entry);
  }

  const graph = buildLayerInteractionHeatmap(input);
  const heatmap = buildInterventionHeatmap(input);
  const contention = scoreSurvivabilityContention(graph.edges);
  const conflict = scoreSurvivabilityConflict(input);
  const equilibrium = scoreEquilibrium(input, interventionDensity);
  const balance = scoreOrchestrationBalance(input);
  const fatigue = scoreRuntimeFatigue(input);

  noteEquilibriumScore(equilibrium);
  noteRuntimeFatigueScore(fatigue);

  lastGraph = graph;
  lastHeatmap = heatmap;

  const profile: MetaOrchestrationProfile = {
    survivabilityConflictScore: conflict,
    orchestrationPressure: computeOrchestrationPressure(input),
    interventionDensity,
    governanceThrashRisk: scoreGovernanceThrashRisk(),
    recoveryOscillationRisk: scoreRecoveryOscillationRisk(),
    telemetryAmplificationScore: scoreTelemetryAmplification(input),
    observerStarvationRisk: scoreObserverStarvationRisk(input),
    stabilizationDeadlockRisk: scoreStabilizationDeadlockRisk(input),
    survivabilityContention: contention,
    runtimeFatigueScore: fatigue,
    orchestrationBalance: balance,
    interventionCooldownEfficiency: scoreInterventionCooldownEfficiency(),
    equilibriumScore: equilibrium,
    crossLayerPressure: scoreCrossLayerPressure(input),
    metaCoordinationStability: computeMetaCoordinationStability(conflict, equilibrium, balance),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastMetaOrchestrationProfile(): MetaOrchestrationProfile | null {
  return lastProfile;
}

export function getLastMetaInteractionGraph(): MetaInteractionGraph | null {
  return lastGraph;
}

export function getMetaOrchestrationDashboard(): MetaOrchestrationDashboard | null {
  if (!lastProfile || !lastGraph) return null;
  return {
    titleJa: META_ORCHESTRATION_UI_JA.sectionTitle,
    safetyBannerJa: META_ORCHESTRATION_UI_JA.safety,
    profile: lastProfile,
    interactionGraph: lastGraph,
    contentionMap: getContentionMap(lastGraph),
    pacingTimeline: getPacingTimelineRecent(6),
    interventionHeatmap: lastHeatmap,
    timelineRecent: getMetaOrchestrationTimelineRecent(6),
  };
}
