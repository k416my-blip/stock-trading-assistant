/**
 * Runtime Self-Limitation — observe-only boundary enforcement (no policy/recommendation changes).
 */
import type {
  LimitationGraphSnapshot,
  RuntimeSelfLimitationDashboard,
  RuntimeSelfLimitationObserveInput,
  RuntimeSelfLimitationProfile,
} from '../types/runtimeSelfLimitation';
import {
  RUNTIME_SELF_LIMITATION_POLL_MS,
  RUNTIME_SELF_LIMITATION_UI_JA,
} from '../constants/runtimeSelfLimitation';
import {
  scoreRuntimeSelfLimitation,
  getSelfLimitationEvolution,
  resetRuntimeSelfLimitationCoordinatorForTest,
} from './runtimeSelfLimitationCoordinator';
import {
  buildMetaRecursionGraph,
  scoreMetaRecursionRisk,
  resetRuntimeMetaRecursionDetectorForTest,
} from './runtimeMetaRecursionDetector';
import {
  detectEgoSignals,
  scoreRuntimeEgo,
  resetRuntimeOrchestrationEgoDetectorForTest,
} from './runtimeOrchestrationEgoDetector';
import {
  scoreRuntimeAdaptiveInflationRisk,
  resetAdaptiveCeilingGovernorForTest,
} from './adaptiveCeilingGovernor';
import {
  computeStabilizationCost,
  scoreStabilizationBudgetPressure,
  resetRuntimeStabilizationBudgetManagerForTest,
} from './runtimeStabilizationBudgetManager';
import {
  detectSelfProtectionBiases,
  scoreRuntimeSelfProtectionBias,
  resetRuntimeSelfProtectionBiasDetectorForTest,
} from './runtimeSelfProtectionBiasDetector';
import {
  scoreObserverIdeologyLockRisk,
  scoreObserverRigidity,
  resetObserverIdeologyLockDetectorForTest,
} from './observerIdeologyLockDetector';
import {
  buildEquilibriumInflationGraph,
  scoreInterventionMomentum,
  scoreRecursiveEquilibriumInflation,
  scoreStabilizationInertia,
  resetRecursiveEquilibriumInflationTrackerForTest,
} from './recursiveEquilibriumInflationTracker';
import { resetLongSessionSelfExpansionEngineForTest } from './longSessionSelfExpansionEngine';
import {
  getMetaBoundaryEvolution,
  scoreRuntimeBoundaryIntegrity,
  scoreRuntimeMetaCognitivePressure,
  scoreRuntimeSelfLimitationConfidence,
  resetRuntimeMetaBoundaryCoordinatorForTest,
} from './runtimeMetaBoundaryCoordinator';
import { resetRuntimeSelfExpansionSuppressorForTest } from './runtimeSelfExpansionSuppressor';
import { resetMetaRecursionLimiterForTest } from './metaRecursionLimiter';
import { resetEgoSuppressionSuggesterForTest } from './egoSuppressionSuggester';
import { resetStabilizationBudgetGovernorForTest } from './stabilizationBudgetGovernor';
import { resetObserverRigidityAnalyzerForTest } from './observerRigidityAnalyzer';
import {
  scoreSelfPreservationDriftRisk,
  resetSelfPreservationDriftDetectorForTest,
} from './selfPreservationDriftDetector';
import { noteInterventionPersistence, resetInterventionPersistenceMonitorForTest } from './interventionPersistenceMonitor';
import { resetEquilibriumLockDetectorForTest } from './equilibriumLockDetector';
import {
  getSelfLimitationTimelineRecent,
  resetSelfLimitationTimelineForTest,
} from './selfLimitationTimeline';
import { runSelfLimitationFlows } from './selfLimitationOrchestrator';
import {
  recordSelfLimitationSoakEvent,
  resetSelfLimitationSoakIntegrationForTest,
  setSelfLimitationSoakHook,
} from './selfLimitationSoakIntegration';

let lastProfile: RuntimeSelfLimitationProfile | null = null;
let lastInput: RuntimeSelfLimitationObserveInput | null = null;
let lastRecursionGraph: LimitationGraphSnapshot | null = null;
let lastInflationGraph: LimitationGraphSnapshot | null = null;
let lastEgoSignals: string[] = [];
let lastBiases: string[] = [];
let lastThrottleAt = 0;

export function resetRuntimeSelfLimitationForTest(): void {
  lastProfile = null;
  lastInput = null;
  lastRecursionGraph = null;
  lastInflationGraph = null;
  lastEgoSignals = [];
  lastBiases = [];
  lastThrottleAt = 0;
  resetRuntimeSelfLimitationCoordinatorForTest();
  resetRuntimeMetaRecursionDetectorForTest();
  resetRuntimeOrchestrationEgoDetectorForTest();
  resetAdaptiveCeilingGovernorForTest();
  resetRuntimeStabilizationBudgetManagerForTest();
  resetRuntimeSelfProtectionBiasDetectorForTest();
  resetObserverIdeologyLockDetectorForTest();
  resetRecursiveEquilibriumInflationTrackerForTest();
  resetLongSessionSelfExpansionEngineForTest();
  resetRuntimeMetaBoundaryCoordinatorForTest();
  resetRuntimeSelfExpansionSuppressorForTest();
  resetMetaRecursionLimiterForTest();
  resetEgoSuppressionSuggesterForTest();
  resetStabilizationBudgetGovernorForTest();
  resetObserverRigidityAnalyzerForTest();
  resetSelfPreservationDriftDetectorForTest();
  resetInterventionPersistenceMonitorForTest();
  resetEquilibriumLockDetectorForTest();
  resetSelfLimitationTimelineForTest();
  resetSelfLimitationSoakIntegrationForTest();
}

export function initRuntimeSelfLimitation(): void {
  lastThrottleAt = 0;
}

export function setRuntimeSelfLimitationSoakHookEnabled(enabled: boolean): void {
  setSelfLimitationSoakHook(enabled);
}

export function shouldRunRuntimeSelfLimitationSample(
  _input: RuntimeSelfLimitationObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_SELF_LIMITATION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeSelfLimitation(
  input: RuntimeSelfLimitationObserveInput,
): RuntimeSelfLimitationProfile {
  runSelfLimitationFlows(input);
  void noteInterventionPersistence(input);
  for (const entry of getSelfLimitationTimelineRecent(5)) {
    recordSelfLimitationSoakEvent(entry);
  }

  lastRecursionGraph = buildMetaRecursionGraph(input);
  lastInflationGraph = buildEquilibriumInflationGraph(input);
  lastEgoSignals = detectEgoSignals(input);
  lastBiases = detectSelfProtectionBiases(input);

  const profile: RuntimeSelfLimitationProfile = {
    runtimeSelfLimitationScore: scoreRuntimeSelfLimitation(input),
    metaRecursionRisk: scoreMetaRecursionRisk(input),
    runtimeEgoScore: scoreRuntimeEgo(input),
    stabilizationBudgetPressure: scoreStabilizationBudgetPressure(input),
    runtimeAdaptiveInflationRisk: scoreRuntimeAdaptiveInflationRisk(input),
    runtimeSelfProtectionBias: scoreRuntimeSelfProtectionBias(input),
    observerIdeologyLockRisk: scoreObserverIdeologyLockRisk(input),
    recursiveEquilibriumInflation: scoreRecursiveEquilibriumInflation(input),
    runtimeBoundaryIntegrity: scoreRuntimeBoundaryIntegrity(input),
    runtimeMetaCognitivePressure: scoreRuntimeMetaCognitivePressure(input),
    observerRigidityScore: scoreObserverRigidity(input),
    runtimeSelfLimitationConfidence: scoreRuntimeSelfLimitationConfidence(input),
    selfPreservationDriftRisk: scoreSelfPreservationDriftRisk(input),
    stabilizationInertia: scoreStabilizationInertia(input),
    interventionMomentum: scoreInterventionMomentum(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  lastInput = input;
  return profile;
}

export function getLastRuntimeSelfLimitationProfile(): RuntimeSelfLimitationProfile | null {
  return lastProfile;
}

export function getRuntimeSelfLimitationDashboard(): RuntimeSelfLimitationDashboard | null {
  if (!lastProfile || !lastRecursionGraph || !lastInflationGraph) return null;
  return {
    titleJa: RUNTIME_SELF_LIMITATION_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_SELF_LIMITATION_UI_JA.safety,
    profile: lastProfile,
    selfLimitationEvolution: getSelfLimitationEvolution(),
    metaRecursionGraph: lastRecursionGraph,
    orchestrationEgoAnalysis: { signals: lastEgoSignals, egoScore: lastProfile.runtimeEgoScore },
    stabilizationBudgetReport: {
      cost: lastInput ? computeStabilizationCost(lastInput) : 0,
      pressure: lastProfile.stabilizationBudgetPressure,
    },
    selfProtectionBiasReport: { biases: lastBiases, score: lastProfile.runtimeSelfProtectionBias },
    observerIdeologyLockReport: {
      rigidity: lastProfile.observerRigidityScore,
      lockRisk: lastProfile.observerIdeologyLockRisk,
    },
    equilibriumInflationReport: lastInflationGraph,
    metaBoundaryEvolution: getMetaBoundaryEvolution(),
    timelineRecent: getSelfLimitationTimelineRecent(6),
  };
}

export const observeMetaCognitiveBoundary = observeRuntimeSelfLimitation;
export const initMetaCognitiveBoundary = initRuntimeSelfLimitation;
