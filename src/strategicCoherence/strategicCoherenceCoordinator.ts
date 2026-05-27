/**
 * Strategic Coherence — global objective alignment only (no policy/recommendation changes).
 */
import type {
  StrategicCoherenceDashboard,
  StrategicCoherenceObserveInput,
  StrategicCoherenceProfile,
  StrategicGraphSnapshot,
} from '../types/strategicCoherence';
import {
  STRATEGIC_COHERENCE_POLL_MS,
  STRATEGIC_COHERENCE_UI_JA,
} from '../constants/strategicCoherence';
import {
  scoreRuntimeStrategicCoherence,
  getCoherenceHistory,
  resetRuntimeStrategicCoherenceCoordinatorForTest,
} from './runtimeStrategicCoherenceCoordinator';
import {
  buildObjectiveAlignmentGraph,
  scoreObjectiveAlignment,
  resetGlobalObjectiveAlignmentEngineForTest,
} from './globalObjectiveAlignmentEngine';
import {
  scoreGlobalUtilityBalance,
  scoreRuntimeStrategicHarmony,
  resetCrossLayerUtilityHarmonizerForTest,
} from './crossLayerUtilityHarmonizer';
import {
  scoreStrategicConsistency,
  scoreRuntimeStrategicPersistence,
  resetRuntimeStrategicEquilibriumGovernorForTest,
} from './runtimeStrategicEquilibriumGovernor';
import {
  buildLayerConflictMap,
  scoreLayerConflictRisk,
  resetLayerObjectiveConflictDetectorForTest,
} from './layerObjectiveConflictDetector';
import { resetRuntimeCoherenceScoringEngineForTest } from './runtimeCoherenceScoringEngine';
import {
  getInterventionPriorityTimeline,
  scoreInterventionPriorityStability,
  resetStrategicInterventionPrioritizerForTest,
} from './strategicInterventionPrioritizer';
import {
  getStrategicDriftEvolution,
  scoreStrategicDriftRisk,
  resetRuntimeObjectiveDriftDetectorForTest,
} from './runtimeObjectiveDriftDetector';
import {
  getContinuityUtilityEvolution,
  scoreContinuityUtility,
  resetGlobalContinuityUtilityCoordinatorForTest,
} from './globalContinuityUtilityCoordinator';
import {
  buildUtilityEquilibriumGraph,
  resetRuntimeUtilityEquilibriumEngineForTest,
} from './runtimeUtilityEquilibriumEngine';
import {
  buildStrategicPacingHarmonizationMap,
  resetStrategicPacingHarmonizerForTest,
} from './strategicPacingHarmonizer';
import {
  scoreRuntimeIntentIntegrity,
  resetRuntimeIntentPreservationEngineForTest,
} from './runtimeIntentPreservationEngine';
import {
  buildCrossLayerConsistencyGraph,
  scoreCrossLayerObjectiveConsistency,
  resetCrossLayerStrategicConsistencyTrackerForTest,
} from './crossLayerStrategicConsistencyTracker';
import { resetRuntimeStrategicArbitrationEngineForTest } from './runtimeStrategicArbitrationEngine';
import { resetLongSessionStrategicPersistenceForTest } from './longSessionStrategicPersistence';
import {
  getStrategicCoherenceTimelineRecent,
  resetRuntimeCoherenceEvolutionTimelineForTest,
} from './runtimeCoherenceEvolutionTimeline';
import {
  scoreStrategicCompressionIntegrity,
  resetStrategicCompressionHarmonizerForTest,
} from './strategicCompressionHarmonizer';
import {
  scoreRuntimeUtilityIntegrity,
  resetRuntimeUtilityIntegrityMonitorForTest,
} from './runtimeUtilityIntegrityMonitor';
import {
  scoreAdaptiveObjectiveConfidence,
  resetAdaptiveObjectiveBalancingForTest,
} from './adaptiveObjectiveBalancing';
import {
  getStrategicEquilibriumTimeline,
  resetRuntimeStrategicEquilibriumEvolutionForTest,
} from './runtimeStrategicEquilibriumEvolution';
import { runStrategicCoherenceFlows } from './strategicCoherenceOrchestrator';
import {
  recordStrategicCoherenceSoakEvent,
  resetStrategicCoherenceSoakIntegrationForTest,
  setStrategicCoherenceSoakHook,
} from './strategicCoherenceSoakIntegration';

let lastProfile: StrategicCoherenceProfile | null = null;
let lastAlignmentGraph: StrategicGraphSnapshot | null = null;
let lastConflictMap: StrategicGraphSnapshot | null = null;
let lastUtilityGraph: StrategicGraphSnapshot | null = null;
let lastConsistencyGraph: StrategicGraphSnapshot | null = null;
let lastPacingMap: StrategicGraphSnapshot | null = null;
let lastThrottleAt = 0;

export function resetStrategicCoherenceForTest(): void {
  lastProfile = null;
  lastAlignmentGraph = null;
  lastConflictMap = null;
  lastUtilityGraph = null;
  lastConsistencyGraph = null;
  lastPacingMap = null;
  lastThrottleAt = 0;
  resetRuntimeStrategicCoherenceCoordinatorForTest();
  resetGlobalObjectiveAlignmentEngineForTest();
  resetCrossLayerUtilityHarmonizerForTest();
  resetRuntimeStrategicEquilibriumGovernorForTest();
  resetLayerObjectiveConflictDetectorForTest();
  resetRuntimeCoherenceScoringEngineForTest();
  resetStrategicInterventionPrioritizerForTest();
  resetRuntimeObjectiveDriftDetectorForTest();
  resetGlobalContinuityUtilityCoordinatorForTest();
  resetRuntimeUtilityEquilibriumEngineForTest();
  resetStrategicPacingHarmonizerForTest();
  resetRuntimeIntentPreservationEngineForTest();
  resetCrossLayerStrategicConsistencyTrackerForTest();
  resetRuntimeStrategicArbitrationEngineForTest();
  resetLongSessionStrategicPersistenceForTest();
  resetRuntimeCoherenceEvolutionTimelineForTest();
  resetStrategicCompressionHarmonizerForTest();
  resetRuntimeUtilityIntegrityMonitorForTest();
  resetAdaptiveObjectiveBalancingForTest();
  resetRuntimeStrategicEquilibriumEvolutionForTest();
  resetStrategicCoherenceSoakIntegrationForTest();
}

export function initStrategicCoherence(): void {
  lastThrottleAt = 0;
}

export function setStrategicCoherenceSoakHookEnabled(enabled: boolean): void {
  setStrategicCoherenceSoakHook(enabled);
}

export function shouldRunStrategicCoherenceSample(
  _input: StrategicCoherenceObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < STRATEGIC_COHERENCE_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeStrategicCoherence(input: StrategicCoherenceObserveInput): StrategicCoherenceProfile {
  runStrategicCoherenceFlows(input);
  void scoreContinuityUtility(input);
  for (const entry of getStrategicCoherenceTimelineRecent(5)) {
    recordStrategicCoherenceSoakEvent(entry);
  }

  lastAlignmentGraph = buildObjectiveAlignmentGraph(input);
  lastConflictMap = buildLayerConflictMap(input);
  lastUtilityGraph = buildUtilityEquilibriumGraph(input);
  lastConsistencyGraph = buildCrossLayerConsistencyGraph(input);
  lastPacingMap = buildStrategicPacingHarmonizationMap(input);

  const profile: StrategicCoherenceProfile = {
    runtimeStrategicCoherence: scoreRuntimeStrategicCoherence(input),
    objectiveAlignmentScore: scoreObjectiveAlignment(input),
    layerConflictRisk: scoreLayerConflictRisk(input),
    strategicConsistency: scoreStrategicConsistency(input),
    runtimeUtilityIntegrity: scoreRuntimeUtilityIntegrity(input),
    interventionPriorityStability: scoreInterventionPriorityStability(input),
    strategicDriftRisk: scoreStrategicDriftRisk(input),
    runtimeIntentIntegrity: scoreRuntimeIntentIntegrity(input),
    crossLayerObjectiveConsistency: scoreCrossLayerObjectiveConsistency(input),
    runtimeStrategicPersistence: scoreRuntimeStrategicPersistence(input),
    globalUtilityBalance: scoreGlobalUtilityBalance(input),
    strategicCompressionIntegrity: scoreStrategicCompressionIntegrity(input),
    continuityUtilityScore: scoreContinuityUtility(input),
    adaptiveObjectiveConfidence: scoreAdaptiveObjectiveConfidence(input),
    runtimeStrategicHarmony: scoreRuntimeStrategicHarmony(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastStrategicCoherenceProfile(): StrategicCoherenceProfile | null {
  return lastProfile;
}

export function getStrategicCoherenceDashboard(): StrategicCoherenceDashboard | null {
  if (!lastProfile || !lastAlignmentGraph || !lastConflictMap || !lastUtilityGraph) return null;
  return {
    titleJa: STRATEGIC_COHERENCE_UI_JA.sectionTitle,
    safetyBannerJa: STRATEGIC_COHERENCE_UI_JA.safety,
    profile: lastProfile,
    coherenceEvolution: getCoherenceHistory(),
    objectiveAlignmentGraph: lastAlignmentGraph,
    layerConflictMap: lastConflictMap,
    utilityEquilibriumGraph: lastUtilityGraph,
    interventionPriorityTimeline: getInterventionPriorityTimeline(),
    strategicDriftEvolution: getStrategicDriftEvolution(),
    crossLayerConsistencyGraph: lastConsistencyGraph ?? lastAlignmentGraph,
    strategicPacingHarmonizationMap: lastPacingMap ?? lastUtilityGraph,
    continuityUtilityEvolution: getContinuityUtilityEvolution(),
    strategicEquilibriumTimeline: getStrategicEquilibriumTimeline(),
    timelineRecent: getStrategicCoherenceTimelineRecent(6),
  };
}

export const observeGlobalObjectiveAlignment = observeStrategicCoherence;
export const initGlobalObjectiveAlignment = initStrategicCoherence;
