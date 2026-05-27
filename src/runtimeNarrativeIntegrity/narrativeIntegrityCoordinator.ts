/**
 * Runtime Narrative Integrity — observe-only recursive narrative & semantic drift governance.
 */
import type {
  NarrativeGraphSnapshot,
  RuntimeNarrativeIntegrityDashboard,
  RuntimeNarrativeIntegrityObserveInput,
  RuntimeNarrativeIntegrityProfile,
} from '../types/runtimeNarrativeIntegrity';
import {
  RUNTIME_NARRATIVE_INTEGRITY_POLL_MS,
  RUNTIME_NARRATIVE_INTEGRITY_UI_JA,
} from '../constants/runtimeNarrativeIntegrity';
import {
  getNarrativeIntegrityEvolution,
  resetRuntimeNarrativeIntegrityCoordinatorForTest,
  scoreRuntimeNarrativeIntegrity,
} from './runtimeNarrativeIntegrityCoordinator';
import {
  buildRecursiveNarrativeGraph,
  resetRecursiveNarrativeInflationModelForTest,
  scoreRecursiveNarrativeInflationRisk,
} from './recursiveNarrativeInflationModel';
import {
  resetSemanticDriftAccumulationEngineForTest,
  scoreRuntimeSemanticDriftRisk,
} from './semanticDriftAccumulationEngine';
import {
  resetExplanationLoopFixationDetectorForTest,
  scoreExplanationLoopFixationRisk,
} from './explanationLoopFixationDetector';
import {
  resetNarrativeLockInTrackerForTest,
  scoreRuntimeNarrativeLockRisk,
} from './narrativeLockInTracker';
import {
  resetCoherenceMythologyAnalyzerForTest,
  scoreCoherenceMythologyRisk,
} from './coherenceMythologyAnalyzer';
import {
  resetStorylineSelfReinforcementMonitorForTest,
  scoreStorylineSelfReinforcementRisk,
} from './storylineSelfReinforcementMonitor';
import {
  buildCrossLayerSemanticGraph,
  resetCrossLayerSemanticConsistencyHarmonizerForTest,
  scoreCrossLayerSemanticConsistency,
} from './crossLayerSemanticConsistencyHarmonizer';
import {
  detectNarrativeDriftSignals,
  resetLongSessionNarrativeDriftEngineForTest,
  scoreRuntimeNarrativeDriftRisk,
} from './longSessionNarrativeDriftEngine';
import {
  getNarrativeEvolution,
  resetRuntimeNarrativeEvolutionCoordinatorForTest,
  scoreInterpretationPersistence,
  scoreNarrativeRigidity,
  scoreSemanticVariance,
  scoreStorylineRecursion,
} from './runtimeNarrativeEvolutionCoordinator';
import { resetSemanticVarianceAnalyzerForTest } from './semanticVarianceAnalyzer';
import { resetStorylineRecursionTrackerForTest } from './storylineRecursionTracker';
import { resetInterpretationPersistenceAnalyzerForTest } from './interpretationPersistenceAnalyzer';
import { resetCoherenceMythologyDetectorForTest } from './coherenceMythologyDetector';
import { resetNarrativeRigidityDetectorForTest } from './narrativeRigidityDetector';
import { resetSemanticInflationMonitorForTest } from './semanticInflationMonitor';
import {
  resetNarrativeConfidenceEngineForTest,
  scoreRuntimeNarrativeConfidence,
} from './narrativeConfidenceEngine';
import { resetNarrativeSignalRegistryForTest } from './narrativeSignalRegistry';
import { resetSemanticHallucinationPersistenceDetectorForTest } from './semanticHallucinationPersistenceDetector';
import { resetExplanationRecursionMonitorForTest } from './explanationRecursionMonitor';
import {
  getNarrativeIntegrityTimelineRecent,
  resetNarrativeIntegrityTimelineForTest,
} from './narrativeIntegrityTimeline';
import { runNarrativeIntegrityFlows } from './narrativeIntegrityOrchestrator';
import {
  recordNarrativeIntegritySoakEvent,
  resetNarrativeIntegritySoakIntegrationForTest,
  setNarrativeIntegritySoakHook,
} from './narrativeIntegritySoakIntegration';

let lastProfile: RuntimeNarrativeIntegrityProfile | null = null;
let lastNarrativeGraph: NarrativeGraphSnapshot | null = null;
let lastSemanticGraph: NarrativeGraphSnapshot | null = null;
let lastDriftSignals: string[] = [];
let lastThrottleAt = 0;

export function resetRuntimeNarrativeIntegrityForTest(): void {
  lastProfile = null;
  lastNarrativeGraph = null;
  lastSemanticGraph = null;
  lastDriftSignals = [];
  lastThrottleAt = 0;
  resetRuntimeNarrativeIntegrityCoordinatorForTest();
  resetRecursiveNarrativeInflationModelForTest();
  resetSemanticDriftAccumulationEngineForTest();
  resetExplanationLoopFixationDetectorForTest();
  resetNarrativeLockInTrackerForTest();
  resetCoherenceMythologyAnalyzerForTest();
  resetStorylineSelfReinforcementMonitorForTest();
  resetCrossLayerSemanticConsistencyHarmonizerForTest();
  resetLongSessionNarrativeDriftEngineForTest();
  resetRuntimeNarrativeEvolutionCoordinatorForTest();
  resetSemanticVarianceAnalyzerForTest();
  resetStorylineRecursionTrackerForTest();
  resetInterpretationPersistenceAnalyzerForTest();
  resetCoherenceMythologyDetectorForTest();
  resetNarrativeRigidityDetectorForTest();
  resetSemanticInflationMonitorForTest();
  resetNarrativeConfidenceEngineForTest();
  resetNarrativeSignalRegistryForTest();
  resetSemanticHallucinationPersistenceDetectorForTest();
  resetExplanationRecursionMonitorForTest();
  resetNarrativeIntegrityTimelineForTest();
  resetNarrativeIntegritySoakIntegrationForTest();
}

export function initRuntimeNarrativeIntegrity(): void {
  lastThrottleAt = 0;
}

export function setRuntimeNarrativeIntegritySoakHookEnabled(enabled: boolean): void {
  setNarrativeIntegritySoakHook(enabled);
}

export function shouldRunRuntimeNarrativeIntegritySample(
  _input: RuntimeNarrativeIntegrityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_NARRATIVE_INTEGRITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeNarrativeIntegrity(
  input: RuntimeNarrativeIntegrityObserveInput,
): RuntimeNarrativeIntegrityProfile {
  runNarrativeIntegrityFlows(input);
  for (const entry of getNarrativeIntegrityTimelineRecent(5)) {
    recordNarrativeIntegritySoakEvent(entry);
  }

  lastNarrativeGraph = buildRecursiveNarrativeGraph(input);
  lastSemanticGraph = buildCrossLayerSemanticGraph(input);
  lastDriftSignals = detectNarrativeDriftSignals(input);

  const profile: RuntimeNarrativeIntegrityProfile = {
    runtimeNarrativeIntegrityScore: scoreRuntimeNarrativeIntegrity(input),
    recursiveNarrativeInflationRisk: scoreRecursiveNarrativeInflationRisk(input),
    runtimeSemanticDriftRisk: scoreRuntimeSemanticDriftRisk(input),
    explanationLoopFixationRisk: scoreExplanationLoopFixationRisk(input),
    runtimeNarrativeLockRisk: scoreRuntimeNarrativeLockRisk(input),
    coherenceMythologyRisk: scoreCoherenceMythologyRisk(input),
    storylineSelfReinforcementRisk: scoreStorylineSelfReinforcementRisk(input),
    crossLayerSemanticConsistency: scoreCrossLayerSemanticConsistency(input),
    runtimeNarrativeDriftRisk: scoreRuntimeNarrativeDriftRisk(input),
    runtimeNarrativeConfidence: scoreRuntimeNarrativeConfidence(input),
    semanticVarianceScore: scoreSemanticVariance(input),
    storylineRecursionScore: scoreStorylineRecursion(input),
    interpretationPersistenceScore: scoreInterpretationPersistence(input),
    narrativeRigidityScore: scoreNarrativeRigidity(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeNarrativeIntegrityProfile(): RuntimeNarrativeIntegrityProfile | null {
  return lastProfile;
}

export function getRuntimeNarrativeIntegrityDashboard(): RuntimeNarrativeIntegrityDashboard | null {
  if (!lastProfile || !lastNarrativeGraph || !lastSemanticGraph) return null;
  return {
    titleJa: RUNTIME_NARRATIVE_INTEGRITY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_NARRATIVE_INTEGRITY_UI_JA.safety,
    profile: lastProfile,
    narrativeIntegrityEvolution: getNarrativeIntegrityEvolution(),
    narrativeEvolution: getNarrativeEvolution(),
    recursiveNarrativeGraph: lastNarrativeGraph,
    crossLayerSemanticGraph: lastSemanticGraph,
    narrativeDriftSignals: lastDriftSignals,
    timelineRecent: getNarrativeIntegrityTimelineRecent(6),
  };
}
