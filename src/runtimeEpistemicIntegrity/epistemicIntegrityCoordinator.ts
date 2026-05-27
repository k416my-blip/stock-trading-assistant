/**
 * Runtime Epistemic Integrity — observe-only adaptive reality modeling.
 */
import type {
  EpistemicGraphSnapshot,
  RuntimeEpistemicIntegrityDashboard,
  RuntimeEpistemicIntegrityObserveInput,
  RuntimeEpistemicIntegrityProfile,
} from '../types/runtimeEpistemicIntegrity';
import {
  RUNTIME_EPISTEMIC_INTEGRITY_POLL_MS,
  RUNTIME_EPISTEMIC_INTEGRITY_UI_JA,
} from '../constants/runtimeEpistemicIntegrity';
import {
  getRealityIntegrityEvolution,
  resetRuntimeRealityModelingCoordinatorForTest,
  scoreRuntimeRealityIntegrity,
} from './runtimeRealityModelingCoordinator';
import {
  buildRecursiveBeliefGraph,
  resetRecursiveBeliefReinforcementModelForTest,
  scoreRecursiveBeliefReinforcementRisk,
} from './recursiveBeliefReinforcementModel';
import {
  resetUtilityRealityDistortionDetectorForTest,
  scoreRuntimeRealityDistortionRisk,
} from './utilityRealityDistortionDetector';
import {
  resetObserverConfirmationLoopMonitorForTest,
  scoreObserverConfirmationLoopRisk,
} from './observerConfirmationLoopMonitor';
import {
  resetGovernanceEpistemologyInflationTrackerForTest,
  scoreRuntimeEpistemologyInflationRisk,
} from './governanceEpistemologyInflationTracker';
import {
  resetEquilibriumHallucinationDetectorForTest,
  scoreRuntimeEquilibriumHallucinationRisk,
} from './equilibriumHallucinationDetector';
import {
  resetOrchestrationWorldviewLockAnalyzerForTest,
  scoreRuntimeWorldviewLockRisk,
} from './orchestrationWorldviewLockAnalyzer';
import {
  buildCrossLayerEpistemicGraph,
  resetCrossLayerEpistemicConsistencyHarmonizerForTest,
  scoreCrossLayerEpistemicConsistency,
} from './crossLayerEpistemicConsistencyHarmonizer';
import {
  detectEpistemicDriftSignals,
  resetLongSessionEpistemicDriftEngineForTest,
  scoreRuntimeEpistemicDriftRisk,
} from './longSessionEpistemicDriftEngine';
import {
  getEpistemicEvolution,
  resetRuntimeEpistemicEvolutionCoordinatorForTest,
  scoreBeliefVariance,
  scoreEpistemicRigidity,
  scoreObserverRecursion,
  scoreRealitySpread,
  scoreWorldviewDiversity,
} from './runtimeEpistemicEvolutionCoordinator';
import { resetBeliefVarianceAnalyzerForTest } from './beliefVarianceAnalyzer';
import { resetRealitySpreadCalculatorForTest } from './realitySpreadCalculator';
import { resetObserverRecursionTrackerForTest } from './observerRecursionTracker';
import { resetEpistemicRigidityDetectorForTest } from './epistemicRigidityDetector';
import { resetWorldviewDiversityScorerForTest } from './worldviewDiversityScorer';
import { resetCoherenceEvolutionTrackerForTest } from './coherenceEvolutionTracker';
import { resetAuditEpistemicPersistenceMonitorForTest } from './auditEpistemicPersistenceMonitor';
import { resetRecursiveCoherenceFixationDetectorForTest } from './recursiveCoherenceFixationDetector';
import {
  resetEpistemicConfidenceEngineForTest,
  scoreRuntimeEpistemicConfidence,
} from './epistemicConfidenceEngine';
import { resetEpistemicSignalRegistryForTest } from './epistemicSignalRegistry';
import {
  getEpistemicIntegrityTimelineRecent,
  resetEpistemicIntegrityTimelineForTest,
} from './epistemicIntegrityTimeline';
import { runEpistemicIntegrityFlows } from './epistemicIntegrityOrchestrator';
import {
  recordEpistemicIntegritySoakEvent,
  resetEpistemicIntegritySoakIntegrationForTest,
  setEpistemicIntegritySoakHook,
} from './epistemicIntegritySoakIntegration';

let lastProfile: RuntimeEpistemicIntegrityProfile | null = null;
let lastBeliefGraph: EpistemicGraphSnapshot | null = null;
let lastEpistemicGraph: EpistemicGraphSnapshot | null = null;
let lastDriftSignals: string[] = [];
let lastThrottleAt = 0;

export function resetRuntimeEpistemicIntegrityForTest(): void {
  lastProfile = null;
  lastBeliefGraph = null;
  lastEpistemicGraph = null;
  lastDriftSignals = [];
  lastThrottleAt = 0;
  resetRuntimeRealityModelingCoordinatorForTest();
  resetRecursiveBeliefReinforcementModelForTest();
  resetUtilityRealityDistortionDetectorForTest();
  resetObserverConfirmationLoopMonitorForTest();
  resetGovernanceEpistemologyInflationTrackerForTest();
  resetEquilibriumHallucinationDetectorForTest();
  resetOrchestrationWorldviewLockAnalyzerForTest();
  resetCrossLayerEpistemicConsistencyHarmonizerForTest();
  resetLongSessionEpistemicDriftEngineForTest();
  resetRuntimeEpistemicEvolutionCoordinatorForTest();
  resetBeliefVarianceAnalyzerForTest();
  resetRealitySpreadCalculatorForTest();
  resetObserverRecursionTrackerForTest();
  resetEpistemicRigidityDetectorForTest();
  resetWorldviewDiversityScorerForTest();
  resetCoherenceEvolutionTrackerForTest();
  resetAuditEpistemicPersistenceMonitorForTest();
  resetRecursiveCoherenceFixationDetectorForTest();
  resetEpistemicConfidenceEngineForTest();
  resetEpistemicSignalRegistryForTest();
  resetEpistemicIntegrityTimelineForTest();
  resetEpistemicIntegritySoakIntegrationForTest();
}

export function initRuntimeEpistemicIntegrity(): void {
  lastThrottleAt = 0;
}

export function setRuntimeEpistemicIntegritySoakHookEnabled(enabled: boolean): void {
  setEpistemicIntegritySoakHook(enabled);
}

export function shouldRunRuntimeEpistemicIntegritySample(
  _input: RuntimeEpistemicIntegrityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_EPISTEMIC_INTEGRITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeEpistemicIntegrity(
  input: RuntimeEpistemicIntegrityObserveInput,
): RuntimeEpistemicIntegrityProfile {
  runEpistemicIntegrityFlows(input);
  for (const entry of getEpistemicIntegrityTimelineRecent(5)) {
    recordEpistemicIntegritySoakEvent(entry);
  }

  lastBeliefGraph = buildRecursiveBeliefGraph(input);
  lastEpistemicGraph = buildCrossLayerEpistemicGraph(input);
  lastDriftSignals = detectEpistemicDriftSignals(input);

  const profile: RuntimeEpistemicIntegrityProfile = {
    runtimeRealityIntegrityScore: scoreRuntimeRealityIntegrity(input),
    recursiveBeliefReinforcementRisk: scoreRecursiveBeliefReinforcementRisk(input),
    runtimeRealityDistortionRisk: scoreRuntimeRealityDistortionRisk(input),
    observerConfirmationLoopRisk: scoreObserverConfirmationLoopRisk(input),
    runtimeEpistemologyInflationRisk: scoreRuntimeEpistemologyInflationRisk(input),
    runtimeEquilibriumHallucinationRisk: scoreRuntimeEquilibriumHallucinationRisk(input),
    runtimeWorldviewLockRisk: scoreRuntimeWorldviewLockRisk(input),
    crossLayerEpistemicConsistency: scoreCrossLayerEpistemicConsistency(input),
    runtimeEpistemicDriftRisk: scoreRuntimeEpistemicDriftRisk(input),
    runtimeEpistemicConfidence: scoreRuntimeEpistemicConfidence(input),
    beliefVarianceScore: scoreBeliefVariance(input),
    realitySpreadScore: scoreRealitySpread(input),
    observerRecursionScore: scoreObserverRecursion(input),
    epistemicRigidityScore: scoreEpistemicRigidity(input),
    worldviewDiversityScore: scoreWorldviewDiversity(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeEpistemicIntegrityProfile(): RuntimeEpistemicIntegrityProfile | null {
  return lastProfile;
}

export function getRuntimeEpistemicIntegrityDashboard(): RuntimeEpistemicIntegrityDashboard | null {
  if (!lastProfile || !lastBeliefGraph || !lastEpistemicGraph) return null;
  return {
    titleJa: RUNTIME_EPISTEMIC_INTEGRITY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_EPISTEMIC_INTEGRITY_UI_JA.safety,
    profile: lastProfile,
    realityIntegrityEvolution: getRealityIntegrityEvolution(),
    epistemicEvolution: getEpistemicEvolution(),
    recursiveBeliefGraph: lastBeliefGraph,
    crossLayerEpistemicGraph: lastEpistemicGraph,
    epistemicDriftSignals: lastDriftSignals,
    timelineRecent: getEpistemicIntegrityTimelineRecent(6),
  };
}
