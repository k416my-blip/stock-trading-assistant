/**
 * Runtime Meta-Cognition — observe-only recursive self-observation governance.
 */
import type {
  MetaCognitionGraphSnapshot,
  RuntimeMetaCognitionDashboard,
  RuntimeMetaCognitionObserveInput,
  RuntimeMetaCognitionProfile,
} from '../types/runtimeMetaCognition';
import {
  RUNTIME_META_COGNITION_POLL_MS,
  RUNTIME_META_COGNITION_UI_JA,
} from '../constants/runtimeMetaCognition';
import {
  getMetaCognitionEvolution,
  resetRuntimeMetaCognitionCoordinatorForTest,
  scoreRuntimeMetaCognition,
} from './runtimeMetaCognitionCoordinator';
import {
  buildRecursiveSelfObservationGraph,
  resetRecursiveSelfObservationInflationModelForTest,
  scoreRecursiveSelfObservationRisk,
} from './recursiveSelfObservationInflationModel';
import {
  resetObserverSelfReferenceLockDetectorForTest,
  scoreObserverSelfReferenceLockRisk,
} from './observerSelfReferenceLockDetector';
import {
  resetMetaCognitiveRigidityTrackerForTest,
  scoreMetaCognitiveRigidityRisk,
} from './metaCognitiveRigidityTracker';
import {
  resetIntrospectionDependencyMonitorForTest,
  scoreRuntimeIntrospectionDependencyRisk,
} from './introspectionDependencyMonitor';
import {
  resetRecursiveAuditFixationAnalyzerForTest,
  scoreRecursiveAuditFixationRisk,
} from './recursiveAuditFixationAnalyzer';
import { resetSelfModelDriftEngineForTest, scoreRuntimeSelfModelDriftRisk } from './selfModelDriftEngine';
import {
  buildCrossLayerSelfGraph,
  resetCrossLayerSelfConsistencyHarmonizerForTest,
  scoreCrossLayerSelfConsistency,
} from './crossLayerSelfConsistencyHarmonizer';
import {
  detectIntrospectionDriftSignals,
  resetLongSessionIntrospectionDriftEngineForTest,
  scoreRuntimeIntrospectionDriftRisk,
} from './longSessionIntrospectionDriftEngine';
import {
  getMetaEvolution,
  resetRuntimeMetaCognitionEvolutionCoordinatorForTest,
  scoreAuditRigidity,
  scoreCoherenceInflation,
  scoreMetaVariance,
  scoreObserverRecursionMeta,
} from './runtimeMetaCognitionEvolutionCoordinator';
import { resetMetaVarianceAnalyzerForTest } from './metaVarianceAnalyzer';
import { resetAuditRigidityTrackerForTest } from './auditRigidityTracker';
import { resetObserverRecursionMetaMonitorForTest } from './observerRecursionMetaMonitor';
import { resetCoherenceInflationDetectorForTest } from './coherenceInflationDetector';
import { resetSelfReferencePersistenceAnalyzerForTest } from './selfReferencePersistenceAnalyzer';
import { resetIntrospectionDependencyTrackerForTest } from './introspectionDependencyTracker';
import { resetSelfExplanationHallucinationDetectorForTest } from './selfExplanationHallucinationDetector';
import {
  resetMetaCognitionConfidenceEngineForTest,
  scoreRuntimeMetaCognitionConfidence,
} from './metaCognitionConfidenceEngine';
import { resetMetaCognitionSignalRegistryForTest } from './metaCognitionSignalRegistry';
import { resetCoherenceOverfittingMonitorForTest } from './coherenceOverfittingMonitor';
import {
  getMetaCognitionTimelineRecent,
  resetMetaCognitionTimelineForTest,
} from './metaCognitionTimeline';
import { runMetaCognitionFlows } from './metaCognitionOrchestrator';
import {
  recordMetaCognitionSoakEvent,
  resetMetaCognitionSoakIntegrationForTest,
  setMetaCognitionSoakHook,
} from './metaCognitionSoakIntegration';

let lastProfile: RuntimeMetaCognitionProfile | null = null;
let lastSelfObservationGraph: MetaCognitionGraphSnapshot | null = null;
let lastSelfGraph: MetaCognitionGraphSnapshot | null = null;
let lastDriftSignals: string[] = [];
let lastThrottleAt = 0;

export function resetRuntimeMetaCognitionForTest(): void {
  lastProfile = null;
  lastSelfObservationGraph = null;
  lastSelfGraph = null;
  lastDriftSignals = [];
  lastThrottleAt = 0;
  resetRuntimeMetaCognitionCoordinatorForTest();
  resetRecursiveSelfObservationInflationModelForTest();
  resetObserverSelfReferenceLockDetectorForTest();
  resetMetaCognitiveRigidityTrackerForTest();
  resetIntrospectionDependencyMonitorForTest();
  resetRecursiveAuditFixationAnalyzerForTest();
  resetSelfModelDriftEngineForTest();
  resetCrossLayerSelfConsistencyHarmonizerForTest();
  resetLongSessionIntrospectionDriftEngineForTest();
  resetRuntimeMetaCognitionEvolutionCoordinatorForTest();
  resetMetaVarianceAnalyzerForTest();
  resetAuditRigidityTrackerForTest();
  resetObserverRecursionMetaMonitorForTest();
  resetCoherenceInflationDetectorForTest();
  resetSelfReferencePersistenceAnalyzerForTest();
  resetIntrospectionDependencyTrackerForTest();
  resetSelfExplanationHallucinationDetectorForTest();
  resetMetaCognitionConfidenceEngineForTest();
  resetMetaCognitionSignalRegistryForTest();
  resetCoherenceOverfittingMonitorForTest();
  resetMetaCognitionTimelineForTest();
  resetMetaCognitionSoakIntegrationForTest();
}

export function initRuntimeMetaCognition(): void {
  lastThrottleAt = 0;
}

export function setRuntimeMetaCognitionSoakHookEnabled(enabled: boolean): void {
  setMetaCognitionSoakHook(enabled);
}

export function shouldRunRuntimeMetaCognitionSample(
  _input: RuntimeMetaCognitionObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_META_COGNITION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeMetaCognition(
  input: RuntimeMetaCognitionObserveInput,
): RuntimeMetaCognitionProfile {
  runMetaCognitionFlows(input);
  for (const entry of getMetaCognitionTimelineRecent(5)) {
    recordMetaCognitionSoakEvent(entry);
  }

  lastSelfObservationGraph = buildRecursiveSelfObservationGraph(input);
  lastSelfGraph = buildCrossLayerSelfGraph(input);
  lastDriftSignals = detectIntrospectionDriftSignals(input);

  const profile: RuntimeMetaCognitionProfile = {
    runtimeMetaCognitionScore: scoreRuntimeMetaCognition(input),
    recursiveSelfObservationRisk: scoreRecursiveSelfObservationRisk(input),
    observerSelfReferenceLockRisk: scoreObserverSelfReferenceLockRisk(input),
    metaCognitiveRigidityRisk: scoreMetaCognitiveRigidityRisk(input),
    runtimeIntrospectionDependencyRisk: scoreRuntimeIntrospectionDependencyRisk(input),
    recursiveAuditFixationRisk: scoreRecursiveAuditFixationRisk(input),
    runtimeSelfModelDriftRisk: scoreRuntimeSelfModelDriftRisk(input),
    crossLayerSelfConsistency: scoreCrossLayerSelfConsistency(input),
    runtimeIntrospectionDriftRisk: scoreRuntimeIntrospectionDriftRisk(input),
    runtimeMetaCognitionConfidence: scoreRuntimeMetaCognitionConfidence(input),
    metaVarianceScore: scoreMetaVariance(input),
    auditRigidityScore: scoreAuditRigidity(input),
    observerRecursionMetaScore: scoreObserverRecursionMeta(input),
    coherenceInflationScore: scoreCoherenceInflation(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeMetaCognitionProfile(): RuntimeMetaCognitionProfile | null {
  return lastProfile;
}

export function getRuntimeMetaCognitionDashboard(): RuntimeMetaCognitionDashboard | null {
  if (!lastProfile || !lastSelfObservationGraph || !lastSelfGraph) return null;
  return {
    titleJa: RUNTIME_META_COGNITION_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_META_COGNITION_UI_JA.safety,
    profile: lastProfile,
    metaCognitionEvolution: getMetaCognitionEvolution(),
    metaEvolution: getMetaEvolution(),
    recursiveSelfObservationGraph: lastSelfObservationGraph,
    crossLayerSelfGraph: lastSelfGraph,
    introspectionDriftSignals: lastDriftSignals,
    timelineRecent: getMetaCognitionTimelineRecent(6),
  };
}
