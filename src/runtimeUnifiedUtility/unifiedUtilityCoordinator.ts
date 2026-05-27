/**
 * Runtime Unified Utility Theory — observe-only existential constraint governance.
 */
import type {
  RuntimeUnifiedUtilityDashboard,
  RuntimeUnifiedUtilityObserveInput,
  RuntimeUnifiedUtilityProfile,
  UtilityGraphSnapshot,
} from '../types/runtimeUnifiedUtility';
import {
  RUNTIME_UNIFIED_UTILITY_POLL_MS,
  RUNTIME_UNIFIED_UTILITY_UI_JA,
} from '../constants/runtimeUnifiedUtility';
import {
  getUnifiedUtilityEvolution,
  resetRuntimeUnifiedUtilityCoordinatorForTest,
  scoreRuntimeUnifiedUtility,
} from './runtimeUnifiedUtilityCoordinator';
import {
  detectExistentialConstraintSignals,
  resetRuntimeExistentialConstraintModelForTest,
  scoreRuntimeExistentialConstraintRisk,
} from './runtimeExistentialConstraintModel';
import {
  buildObjectiveFragmentationGraph,
  resetGoalFragmentationDetectorForTest,
  scoreObjectiveFragmentationRisk,
} from './goalFragmentationDetector';
import {
  resetRuntimeUtilityDistortionDetectorForTest,
  scoreRuntimeUtilityDistortion,
} from './runtimeUtilityDistortionDetector';
import {
  resetGovernanceInflationTrackerForTest,
  scoreRuntimeGovernanceInflationRisk,
} from './governanceInflationTracker';
import {
  resetStabilityAddictionAnalyzerForTest,
  scoreRuntimeStabilityAddictionRisk,
} from './stabilityAddictionAnalyzer';
import {
  resetObserverCivilizationRiskMonitorForTest,
  scoreObserverCivilizationRisk,
} from './observerCivilizationRiskMonitor';
import {
  buildCrossLayerUtilityGraph,
  resetCrossLayerUtilityHarmonizerForTest,
  scoreCrossLayerUtilityConsistency,
} from './crossLayerUtilityHarmonizer';
import {
  resetLongSessionExistentialDriftEngineForTest,
  scoreRuntimeExistentialDriftRisk,
} from './longSessionExistentialDriftEngine';
import {
  getEquilibriumEvolution,
  resetRuntimeUnifiedUtilityEvolutionCoordinatorForTest,
  scorePurposeConsistency,
  scoreStrategicIntegrity,
  scoreUtilityEquilibriumVariance,
  scoreUtilityPersistence,
} from './runtimeUnifiedUtilityEvolutionCoordinator';
import { resetSurvivalBiasAuditorForTest } from './survivalBiasAuditor';
import { resetOrchestrationPersistenceTrackerForTest } from './orchestrationPersistenceTracker';
import { resetInterventionPermanenceMonitorForTest } from './interventionPermanenceMonitor';
import { resetContinuityDistortionDetectorForTest } from './continuityDistortionDetector';
import { resetMetaEquilibriumLockDetectorForTest } from './metaEquilibriumLockDetector';
import { resetUtilityIllusionAnalyzerForTest } from './utilityIllusionAnalyzer';
import { resetLayerObjectiveDivergenceGraphBuilderForTest } from './layerObjectiveDivergenceGraphBuilder';
import {
  resetUnifiedUtilityConfidenceEngineForTest,
  scoreRuntimeUnifiedUtilityConfidence,
} from './unifiedUtilityConfidenceEngine';
import { resetCrossLayerSpreadCalculatorForTest } from './crossLayerSpreadCalculator';
import { resetExistentialConstraintSignalRegistryForTest } from './existentialConstraintSignalRegistry';
import {
  getUnifiedUtilityTimelineRecent,
  resetUnifiedUtilityTimelineForTest,
} from './unifiedUtilityTimeline';
import { runUnifiedUtilityFlows } from './unifiedUtilityOrchestrator';
import {
  recordUnifiedUtilitySoakEvent,
  resetUnifiedUtilitySoakIntegrationForTest,
  setUnifiedUtilitySoakHook,
} from './unifiedUtilitySoakIntegration';

let lastProfile: RuntimeUnifiedUtilityProfile | null = null;
let lastFragmentationGraph: UtilityGraphSnapshot | null = null;
let lastCrossLayerGraph: UtilityGraphSnapshot | null = null;
let lastConstraintSignals: string[] = [];
let lastThrottleAt = 0;

export function resetRuntimeUnifiedUtilityForTest(): void {
  lastProfile = null;
  lastFragmentationGraph = null;
  lastCrossLayerGraph = null;
  lastConstraintSignals = [];
  lastThrottleAt = 0;
  resetRuntimeUnifiedUtilityCoordinatorForTest();
  resetRuntimeExistentialConstraintModelForTest();
  resetGoalFragmentationDetectorForTest();
  resetRuntimeUtilityDistortionDetectorForTest();
  resetGovernanceInflationTrackerForTest();
  resetStabilityAddictionAnalyzerForTest();
  resetObserverCivilizationRiskMonitorForTest();
  resetCrossLayerUtilityHarmonizerForTest();
  resetLongSessionExistentialDriftEngineForTest();
  resetRuntimeUnifiedUtilityEvolutionCoordinatorForTest();
  resetSurvivalBiasAuditorForTest();
  resetOrchestrationPersistenceTrackerForTest();
  resetInterventionPermanenceMonitorForTest();
  resetContinuityDistortionDetectorForTest();
  resetMetaEquilibriumLockDetectorForTest();
  resetUtilityIllusionAnalyzerForTest();
  resetLayerObjectiveDivergenceGraphBuilderForTest();
  resetUnifiedUtilityConfidenceEngineForTest();
  resetCrossLayerSpreadCalculatorForTest();
  resetExistentialConstraintSignalRegistryForTest();
  resetUnifiedUtilityTimelineForTest();
  resetUnifiedUtilitySoakIntegrationForTest();
}

export function initRuntimeUnifiedUtility(): void {
  lastThrottleAt = 0;
}

export function setRuntimeUnifiedUtilitySoakHookEnabled(enabled: boolean): void {
  setUnifiedUtilitySoakHook(enabled);
}

export function shouldRunRuntimeUnifiedUtilitySample(
  _input: RuntimeUnifiedUtilityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_UNIFIED_UTILITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeUnifiedUtility(
  input: RuntimeUnifiedUtilityObserveInput,
): RuntimeUnifiedUtilityProfile {
  runUnifiedUtilityFlows(input);
  for (const entry of getUnifiedUtilityTimelineRecent(5)) {
    recordUnifiedUtilitySoakEvent(entry);
  }

  lastFragmentationGraph = buildObjectiveFragmentationGraph(input);
  lastCrossLayerGraph = buildCrossLayerUtilityGraph(input);
  lastConstraintSignals = detectExistentialConstraintSignals(input);

  const profile: RuntimeUnifiedUtilityProfile = {
    runtimeUnifiedUtilityScore: scoreRuntimeUnifiedUtility(input),
    runtimeExistentialConstraintRisk: scoreRuntimeExistentialConstraintRisk(input),
    objectiveFragmentationRisk: scoreObjectiveFragmentationRisk(input),
    runtimeUtilityDistortionScore: scoreRuntimeUtilityDistortion(input),
    runtimeGovernanceInflationRisk: scoreRuntimeGovernanceInflationRisk(input),
    runtimeStabilityAddictionRisk: scoreRuntimeStabilityAddictionRisk(input),
    observerCivilizationRisk: scoreObserverCivilizationRisk(input),
    crossLayerUtilityConsistency: scoreCrossLayerUtilityConsistency(input),
    runtimeExistentialDriftRisk: scoreRuntimeExistentialDriftRisk(input),
    runtimeUnifiedUtilityConfidence: scoreRuntimeUnifiedUtilityConfidence(input),
    utilityEquilibriumVariance: scoreUtilityEquilibriumVariance(input),
    strategicIntegrityScore: scoreStrategicIntegrity(input),
    purposeConsistencyScore: scorePurposeConsistency(input),
    utilityPersistenceScore: scoreUtilityPersistence(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeUnifiedUtilityProfile(): RuntimeUnifiedUtilityProfile | null {
  return lastProfile;
}

export function getRuntimeUnifiedUtilityDashboard(): RuntimeUnifiedUtilityDashboard | null {
  if (!lastProfile || !lastFragmentationGraph || !lastCrossLayerGraph) return null;
  return {
    titleJa: RUNTIME_UNIFIED_UTILITY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_UNIFIED_UTILITY_UI_JA.safety,
    profile: lastProfile,
    unifiedUtilityEvolution: getUnifiedUtilityEvolution(),
    equilibriumEvolution: getEquilibriumEvolution(),
    objectiveFragmentationGraph: lastFragmentationGraph,
    crossLayerUtilityGraph: lastCrossLayerGraph,
    existentialConstraintSignals: lastConstraintSignals,
    timelineRecent: getUnifiedUtilityTimelineRecent(6),
  };
}
