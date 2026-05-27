/**
 * Runtime Agency Integrity — observe-only recursive agency & constraint preservation.
 */
import type {
  AgencyGraphSnapshot,
  RuntimeAgencyIntegrityDashboard,
  RuntimeAgencyIntegrityObserveInput,
  RuntimeAgencyIntegrityProfile,
} from '../types/runtimeAgencyIntegrity';
import {
  RUNTIME_AGENCY_INTEGRITY_POLL_MS,
  RUNTIME_AGENCY_INTEGRITY_UI_JA,
} from '../constants/runtimeAgencyIntegrity';
import {
  getAgencyIntegrityEvolution,
  resetRuntimeAgencyIntegrityCoordinatorForTest,
  scoreRuntimeAgencyIntegrity,
} from './runtimeAgencyIntegrityCoordinator';
import {
  buildRecursiveAutonomyGraph,
  resetRecursiveAutonomyInflationModelForTest,
  scoreRecursiveAutonomyInflationRisk,
} from './recursiveAutonomyInflationModel';
import {
  resetConstraintErosionMonitorForTest,
  scoreConstraintStability,
  scoreRuntimeConstraintErosionRisk,
} from './constraintErosionMonitor';
import {
  resetObserverAgencyFusionDetectorForTest,
  scoreObserverAgencyFusionRisk,
} from './observerAgencyFusionDetector';
import {
  resetGovernanceAutonomyCreepTrackerForTest,
  scoreRuntimeGovernanceAutonomyRisk,
} from './governanceAutonomyCreepTracker';
import {
  resetRecursiveInterventionPersistenceAnalyzerForTest,
  scoreRecursiveInterventionPersistenceRisk,
} from './recursiveInterventionPersistenceAnalyzer';
import {
  resetEquilibriumDependencyLockDetectorForTest,
  scoreRuntimeEquilibriumDependencyRisk,
} from './equilibriumDependencyLockDetector';
import {
  buildCrossLayerAgencyGraph,
  resetCrossLayerAgencyConsistencyHarmonizerForTest,
  scoreCrossLayerAgencyConsistency,
} from './crossLayerAgencyConsistencyHarmonizer';
import {
  detectAutonomyDriftSignals,
  resetLongSessionAutonomyDriftEngineForTest,
  scoreRuntimeAutonomyDriftRisk,
} from './longSessionAutonomyDriftEngine';
import {
  getAgencyEvolution,
  resetRuntimeAgencyEvolutionCoordinatorForTest,
  scoreAgencyVariance,
  scoreAutonomyRigidity,
  scoreObserverRecursionAgency,
} from './runtimeAgencyEvolutionCoordinator';
import { resetAgencyVarianceAnalyzerForTest } from './agencyVarianceAnalyzer';
import { resetConstraintStabilityTrackerForTest } from './constraintStabilityTracker';
import { resetObserverRecursionAgencyMonitorForTest } from './observerRecursionAgencyMonitor';
import { resetAutonomyRigidityDetectorForTest } from './autonomyRigidityDetector';
import { resetGovernancePersistenceAnalyzerForTest } from './governancePersistenceAnalyzer';
import { resetEquilibriumFixationTrackerForTest } from './equilibriumFixationTracker';
import { resetAutonomyLockInDetectorForTest } from './autonomyLockInDetector';
import {
  resetAgencyConfidenceEngineForTest,
  scoreRuntimeAgencyConfidence,
} from './agencyConfidenceEngine';
import { resetAgencySignalRegistryForTest } from './agencySignalRegistry';
import { resetOrchestrationSelfPreservationMonitorForTest } from './orchestrationSelfPreservationMonitor';
import {
  getAgencyIntegrityTimelineRecent,
  resetAgencyIntegrityTimelineForTest,
} from './agencyIntegrityTimeline';
import { runAgencyIntegrityFlows } from './agencyIntegrityOrchestrator';
import {
  recordAgencyIntegritySoakEvent,
  resetAgencyIntegritySoakIntegrationForTest,
  setAgencyIntegritySoakHook,
} from './agencyIntegritySoakIntegration';

let lastProfile: RuntimeAgencyIntegrityProfile | null = null;
let lastAutonomyGraph: AgencyGraphSnapshot | null = null;
let lastAgencyGraph: AgencyGraphSnapshot | null = null;
let lastDriftSignals: string[] = [];
let lastThrottleAt = 0;

export function resetRuntimeAgencyIntegrityForTest(): void {
  lastProfile = null;
  lastAutonomyGraph = null;
  lastAgencyGraph = null;
  lastDriftSignals = [];
  lastThrottleAt = 0;
  resetRuntimeAgencyIntegrityCoordinatorForTest();
  resetRecursiveAutonomyInflationModelForTest();
  resetConstraintErosionMonitorForTest();
  resetObserverAgencyFusionDetectorForTest();
  resetGovernanceAutonomyCreepTrackerForTest();
  resetRecursiveInterventionPersistenceAnalyzerForTest();
  resetEquilibriumDependencyLockDetectorForTest();
  resetCrossLayerAgencyConsistencyHarmonizerForTest();
  resetLongSessionAutonomyDriftEngineForTest();
  resetRuntimeAgencyEvolutionCoordinatorForTest();
  resetAgencyVarianceAnalyzerForTest();
  resetConstraintStabilityTrackerForTest();
  resetObserverRecursionAgencyMonitorForTest();
  resetAutonomyRigidityDetectorForTest();
  resetGovernancePersistenceAnalyzerForTest();
  resetEquilibriumFixationTrackerForTest();
  resetAutonomyLockInDetectorForTest();
  resetAgencyConfidenceEngineForTest();
  resetAgencySignalRegistryForTest();
  resetOrchestrationSelfPreservationMonitorForTest();
  resetAgencyIntegrityTimelineForTest();
  resetAgencyIntegritySoakIntegrationForTest();
}

export function initRuntimeAgencyIntegrity(): void {
  lastThrottleAt = 0;
}

export function setRuntimeAgencyIntegritySoakHookEnabled(enabled: boolean): void {
  setAgencyIntegritySoakHook(enabled);
}

export function shouldRunRuntimeAgencyIntegritySample(
  _input: RuntimeAgencyIntegrityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_AGENCY_INTEGRITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeAgencyIntegrity(
  input: RuntimeAgencyIntegrityObserveInput,
): RuntimeAgencyIntegrityProfile {
  runAgencyIntegrityFlows(input);
  for (const entry of getAgencyIntegrityTimelineRecent(5)) {
    recordAgencyIntegritySoakEvent(entry);
  }

  lastAutonomyGraph = buildRecursiveAutonomyGraph(input);
  lastAgencyGraph = buildCrossLayerAgencyGraph(input);
  lastDriftSignals = detectAutonomyDriftSignals(input);

  const profile: RuntimeAgencyIntegrityProfile = {
    runtimeAgencyIntegrityScore: scoreRuntimeAgencyIntegrity(input),
    recursiveAutonomyInflationRisk: scoreRecursiveAutonomyInflationRisk(input),
    runtimeConstraintErosionRisk: scoreRuntimeConstraintErosionRisk(input),
    observerAgencyFusionRisk: scoreObserverAgencyFusionRisk(input),
    runtimeGovernanceAutonomyRisk: scoreRuntimeGovernanceAutonomyRisk(input),
    recursiveInterventionPersistenceRisk: scoreRecursiveInterventionPersistenceRisk(input),
    runtimeEquilibriumDependencyRisk: scoreRuntimeEquilibriumDependencyRisk(input),
    crossLayerAgencyConsistency: scoreCrossLayerAgencyConsistency(input),
    runtimeAutonomyDriftRisk: scoreRuntimeAutonomyDriftRisk(input),
    runtimeAgencyConfidence: scoreRuntimeAgencyConfidence(input),
    agencyVarianceScore: scoreAgencyVariance(input),
    constraintStabilityScore: scoreConstraintStability(input),
    observerRecursionAgencyScore: scoreObserverRecursionAgency(input),
    autonomyRigidityScore: scoreAutonomyRigidity(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeAgencyIntegrityProfile(): RuntimeAgencyIntegrityProfile | null {
  return lastProfile;
}

export function getRuntimeAgencyIntegrityDashboard(): RuntimeAgencyIntegrityDashboard | null {
  if (!lastProfile || !lastAutonomyGraph || !lastAgencyGraph) return null;
  return {
    titleJa: RUNTIME_AGENCY_INTEGRITY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_AGENCY_INTEGRITY_UI_JA.safety,
    profile: lastProfile,
    agencyIntegrityEvolution: getAgencyIntegrityEvolution(),
    agencyEvolution: getAgencyEvolution(),
    recursiveAutonomyGraph: lastAutonomyGraph,
    crossLayerAgencyGraph: lastAgencyGraph,
    autonomyDriftSignals: lastDriftSignals,
    timelineRecent: getAgencyIntegrityTimelineRecent(6),
  };
}
