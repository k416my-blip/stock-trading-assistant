/**
 * Amplification Suppression — self-protection / load shedding only (no policy/recommendation changes).
 */
import type {
  AmplificationGraphSnapshot,
  AmplificationSuppressionDashboard,
  AmplificationSuppressionObserveInput,
  AmplificationSuppressionProfile,
} from '../types/amplificationSuppression';
import {
  AMPLIFICATION_SUPPRESSION_POLL_MS,
  AMPLIFICATION_SUPPRESSION_UI_JA,
} from '../constants/amplificationSuppression';
import { scoreRuntimeAmplificationRisk, scoreAmplificationPressure, resetRuntimeAmplificationDetectorForTest } from './runtimeAmplificationDetector';
import { scoreObserverCascadeRisk, resetObserverCascadeSuppressorForTest } from './observerCascadeSuppressor';
import { scoreTelemetryRecursionRisk, getTelemetryRecursionMap, resetTelemetryRecursionLimiterForTest } from './telemetryRecursionLimiter';
import { scoreRecoveryAmplificationRisk, getRecoveryAmplificationChain, resetRecoveryAmplificationGuardForTest } from './recoveryAmplificationGuard';
import { computeLoadSheddingSeverity, resetAutonomousLoadSheddingCoordinatorForTest } from './autonomousLoadSheddingCoordinator';
import { scoreObserverDensity, noteObserverDensity, getObserverDensityEvolution, resetObserverDensityRegulatorForTest } from './observerDensityRegulator';
import { computeRuntimeInterventionDensity, noteIntervention, resetRuntimeInterventionBudgetManagerForTest } from './runtimeInterventionBudgetManager';
import { buildAmplificationPropagationGraph, resetCrossLayerAmplificationTrackerForTest } from './crossLayerAmplificationTracker';
import { scoreRecursiveOrchestrationRisk, resetRecursiveOrchestrationLimiterForTest } from './recursiveOrchestrationLimiter';
import { scoreStabilizationOverhead, resetRuntimeOverloadStabilizerForTest } from './runtimeOverloadStabilizer';
import { resetHeavyObserverQuarantineForTest } from './heavyObserverQuarantine';
import { scoreSurvivabilityCost, resetSurvivabilityCostGovernorForTest } from './survivabilityCostGovernor';
import { resetRuntimeFeedbackLoopSuppressorForTest } from './runtimeFeedbackLoopSuppressor';
import { resetAmplificationAwarePacingEngineForTest } from './amplificationAwarePacingEngine';
import { scoreThermalAmplificationPressure, resetThermalAmplificationLimiterForTest } from './thermalAmplificationLimiter';
import { resetMemoryPressureObserverReducerForTest } from './memoryPressureObserverReducer';
import { scoreWebsocketStormRisk, resetWebsocketStormSuppressorForTest } from './websocketStormSuppressor';
import { resetBackgroundStarvationSheddingModeForTest } from './backgroundStarvationSheddingMode';
import { scoreRuntimeEntropy, getEntropyTimeline, resetRuntimeEntropyStabilizerForTest } from './runtimeEntropyStabilizer';
import {
  scoreRuntimeEquilibriumStability,
  buildStabilizationEquilibriumGraph,
  resetAutonomousStabilizationEquilibriumEngineForTest,
} from './autonomousStabilizationEquilibriumEngine';
import {
  getAmplificationTimelineRecent,
  getLoadSheddingTimeline,
  resetAmplificationSuppressionTimelineForTest,
} from './amplificationSuppressionTimeline';
import { runAmplificationSuppressionFlows } from './amplificationSuppressionOrchestrator';
import {
  recordAmplificationSuppressionSoakEvent,
  resetAmplificationSuppressionSoakIntegrationForTest,
  setAmplificationSuppressionSoakHook,
} from './amplificationSuppressionSoakIntegration';

let lastProfile: AmplificationSuppressionProfile | null = null;
let lastPropagationGraph: AmplificationGraphSnapshot | null = null;
let lastEquilibriumGraph: AmplificationGraphSnapshot | null = null;
let lastRecoveryChain: string[] = [];
let lastThrottleAt = 0;

export function resetAmplificationSuppressionForTest(): void {
  lastProfile = null;
  lastPropagationGraph = null;
  lastEquilibriumGraph = null;
  lastRecoveryChain = [];
  lastThrottleAt = 0;
  resetRuntimeAmplificationDetectorForTest();
  resetObserverCascadeSuppressorForTest();
  resetTelemetryRecursionLimiterForTest();
  resetRecoveryAmplificationGuardForTest();
  resetAutonomousLoadSheddingCoordinatorForTest();
  resetObserverDensityRegulatorForTest();
  resetRuntimeInterventionBudgetManagerForTest();
  resetCrossLayerAmplificationTrackerForTest();
  resetRecursiveOrchestrationLimiterForTest();
  resetRuntimeOverloadStabilizerForTest();
  resetHeavyObserverQuarantineForTest();
  resetSurvivabilityCostGovernorForTest();
  resetRuntimeFeedbackLoopSuppressorForTest();
  resetAmplificationAwarePacingEngineForTest();
  resetThermalAmplificationLimiterForTest();
  resetMemoryPressureObserverReducerForTest();
  resetWebsocketStormSuppressorForTest();
  resetBackgroundStarvationSheddingModeForTest();
  resetRuntimeEntropyStabilizerForTest();
  resetAutonomousStabilizationEquilibriumEngineForTest();
  resetAmplificationSuppressionTimelineForTest();
  resetAmplificationSuppressionSoakIntegrationForTest();
}

export function initAmplificationSuppression(): void {
  lastThrottleAt = 0;
}

export function setAmplificationSuppressionSoakHookEnabled(enabled: boolean): void {
  setAmplificationSuppressionSoakHook(enabled);
}

export function shouldRunAmplificationSuppressionSample(
  _input: AmplificationSuppressionObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < AMPLIFICATION_SUPPRESSION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeAmplificationSuppression(
  input: AmplificationSuppressionObserveInput,
): AmplificationSuppressionProfile {
  noteIntervention();
  const interventionDensity = computeRuntimeInterventionDensity();
  const density = scoreObserverDensity(input);
  noteObserverDensity(density);
  const survivabilityCost = scoreSurvivabilityCost(input);
  const entropy = scoreRuntimeEntropy(input, interventionDensity);
  const stability = scoreRuntimeEquilibriumStability(input, entropy, survivabilityCost);

  runAmplificationSuppressionFlows(input, interventionDensity, density, entropy, stability);
  for (const entry of getAmplificationTimelineRecent(5)) {
    recordAmplificationSuppressionSoakEvent(entry);
  }

  const propagation = buildAmplificationPropagationGraph(input);
  lastPropagationGraph = propagation;
  lastEquilibriumGraph = buildStabilizationEquilibriumGraph(propagation);
  lastRecoveryChain = getRecoveryAmplificationChain();

  const amplificationRisk = scoreRuntimeAmplificationRisk(input);

  const profile: AmplificationSuppressionProfile = {
    runtimeAmplificationRisk: amplificationRisk,
    observerCascadeRisk: scoreObserverCascadeRisk(density, input.observerOverheadRatio),
    telemetryRecursionRisk: scoreTelemetryRecursionRisk(input),
    recoveryAmplificationRisk: scoreRecoveryAmplificationRisk(input),
    runtimeInterventionDensity: interventionDensity,
    observerDensityScore: density,
    stabilizationOverhead: scoreStabilizationOverhead(input),
    runtimeEntropyScore: entropy,
    amplificationPressure: scoreAmplificationPressure(input),
    loadSheddingSeverity: computeLoadSheddingSeverity(
      Math.max(interventionDensity, input.observerOverheadRatio),
    ),
    recursiveOrchestrationRisk: scoreRecursiveOrchestrationRisk(),
    survivabilityCost,
    websocketStormRisk: scoreWebsocketStormRisk(input),
    thermalAmplificationPressure: scoreThermalAmplificationPressure(input),
    runtimeEquilibriumStability: stability,
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastAmplificationSuppressionProfile(): AmplificationSuppressionProfile | null {
  return lastProfile;
}

export function getAmplificationSuppressionDashboard(): AmplificationSuppressionDashboard | null {
  if (!lastProfile || !lastPropagationGraph || !lastEquilibriumGraph) return null;
  return {
    titleJa: AMPLIFICATION_SUPPRESSION_UI_JA.sectionTitle,
    safetyBannerJa: AMPLIFICATION_SUPPRESSION_UI_JA.safety,
    profile: lastProfile,
    propagationGraph: lastPropagationGraph,
    observerDensityEvolution: getObserverDensityEvolution(),
    telemetryRecursionMap: getTelemetryRecursionMap(),
    entropyTimeline: getEntropyTimeline(),
    loadSheddingTimeline: getLoadSheddingTimeline(),
    recoveryAmplificationChain: lastRecoveryChain,
    equilibriumGraph: lastEquilibriumGraph,
    timelineRecent: getAmplificationTimelineRecent(6),
  };
}
