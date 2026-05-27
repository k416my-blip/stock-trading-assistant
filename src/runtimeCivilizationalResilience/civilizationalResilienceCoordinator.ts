/**
 * Runtime Civilizational Resilience — observe-only civilizational ecology governance.
 */
import type {
  EcologyGraphSnapshot,
  RuntimeCivilizationalResilienceDashboard,
  RuntimeCivilizationalResilienceObserveInput,
  RuntimeCivilizationalResilienceProfile,
} from '../types/runtimeCivilizationalResilience';
import {
  RUNTIME_CIVILIZATIONAL_RESILIENCE_POLL_MS,
  RUNTIME_CIVILIZATIONAL_RESILIENCE_UI_JA,
} from '../constants/runtimeCivilizationalResilience';
import {
  getCivilizationEvolution,
  resetRuntimeCivilizationCoordinatorForTest,
  scoreRuntimeCivilization,
} from './runtimeCivilizationCoordinator';
import {
  buildRecursiveGovernanceGraph,
  resetRecursiveGovernanceEcologyModelForTest,
  scoreRecursiveGovernanceEcologyRisk,
} from './recursiveGovernanceEcologyModel';
import {
  resetUtilityMonocultureDetectorForTest,
  scoreRuntimeUtilityMonocultureRisk,
} from './utilityMonocultureDetector';
import {
  resetObserverEcosystemInflationMonitorForTest,
  scoreObserverEcosystemInflationRisk,
} from './observerEcosystemInflationMonitor';
import {
  resetStabilityIdeologyAnalyzerForTest,
  scoreRuntimeStabilityIdeologyRisk,
} from './stabilityIdeologyAnalyzer';
import {
  resetOrchestrationCivilizationTrackerForTest,
  scoreRuntimeOrchestrationCivilizationRisk,
} from './orchestrationCivilizationTracker';
import {
  resetGovernanceBiodiversityAnalyzerForTest,
  scoreGovernanceBiodiversity,
} from './governanceBiodiversityAnalyzer';
import {
  buildCrossLayerEcologyGraph,
  resetCrossLayerEcologicalBalancerForTest,
  scoreCrossLayerEcologyIntegrity,
} from './crossLayerEcologicalBalancer';
import {
  detectCivilizationDriftSignals,
  resetLongSessionCivilizationDriftEngineForTest,
  scoreRuntimeCivilizationDriftRisk,
} from './longSessionCivilizationDriftEngine';
import {
  getEcologicalEvolution,
  resetRuntimeEcologicalEvolutionCoordinatorForTest,
  scoreCivilizationSpread,
  scoreEcosystemPersistence,
  scoreGovernanceVariance,
  scoreUtilityDiversity,
} from './runtimeEcologicalEvolutionCoordinator';
import { resetAuditCivilizationPersistenceMonitorForTest } from './auditCivilizationPersistenceMonitor';
import { resetEquilibriumIdeologyDetectorForTest } from './equilibriumIdeologyDetector';
import { resetMetaGovernanceLockDetectorForTest } from './metaGovernanceLockDetector';
import { resetCivilizationSpreadCalculatorForTest } from './civilizationSpreadCalculator';
import { resetEcosystemPersistenceTrackerForTest } from './ecosystemPersistenceTracker';
import { resetGovernanceVarianceAnalyzerForTest } from './governanceVarianceAnalyzer';
import { resetUtilityDiversityScorerForTest } from './utilityDiversityScorer';
import { resetStrategicEcologyIntegrityMonitorForTest } from './strategicEcologyIntegrityMonitor';
import {
  resetEcologicalConfidenceEngineForTest,
  scoreRuntimeEcologicalConfidence,
} from './ecologicalConfidenceEngine';
import { resetCivilizationSignalRegistryForTest } from './civilizationSignalRegistry';
import {
  getCivilizationalEcologyTimelineRecent,
  resetCivilizationalEcologyTimelineForTest,
} from './civilizationalEcologyTimeline';
import { runCivilizationalEcologyFlows } from './civilizationalEcologyOrchestrator';
import {
  recordCivilizationalResilienceSoakEvent,
  resetCivilizationalResilienceSoakIntegrationForTest,
  setCivilizationalResilienceSoakHook,
} from './civilizationalResilienceSoakIntegration';

let lastProfile: RuntimeCivilizationalResilienceProfile | null = null;
let lastRecursiveGraph: EcologyGraphSnapshot | null = null;
let lastEcologyGraph: EcologyGraphSnapshot | null = null;
let lastDriftSignals: string[] = [];
let lastThrottleAt = 0;

export function resetRuntimeCivilizationalResilienceForTest(): void {
  lastProfile = null;
  lastRecursiveGraph = null;
  lastEcologyGraph = null;
  lastDriftSignals = [];
  lastThrottleAt = 0;
  resetRuntimeCivilizationCoordinatorForTest();
  resetRecursiveGovernanceEcologyModelForTest();
  resetUtilityMonocultureDetectorForTest();
  resetObserverEcosystemInflationMonitorForTest();
  resetStabilityIdeologyAnalyzerForTest();
  resetOrchestrationCivilizationTrackerForTest();
  resetGovernanceBiodiversityAnalyzerForTest();
  resetCrossLayerEcologicalBalancerForTest();
  resetLongSessionCivilizationDriftEngineForTest();
  resetRuntimeEcologicalEvolutionCoordinatorForTest();
  resetAuditCivilizationPersistenceMonitorForTest();
  resetEquilibriumIdeologyDetectorForTest();
  resetMetaGovernanceLockDetectorForTest();
  resetCivilizationSpreadCalculatorForTest();
  resetEcosystemPersistenceTrackerForTest();
  resetGovernanceVarianceAnalyzerForTest();
  resetUtilityDiversityScorerForTest();
  resetStrategicEcologyIntegrityMonitorForTest();
  resetEcologicalConfidenceEngineForTest();
  resetCivilizationSignalRegistryForTest();
  resetCivilizationalEcologyTimelineForTest();
  resetCivilizationalResilienceSoakIntegrationForTest();
}

export function initRuntimeCivilizationalResilience(): void {
  lastThrottleAt = 0;
}

export function setRuntimeCivilizationalResilienceSoakHookEnabled(enabled: boolean): void {
  setCivilizationalResilienceSoakHook(enabled);
}

export function shouldRunRuntimeCivilizationalResilienceSample(
  _input: RuntimeCivilizationalResilienceObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_CIVILIZATIONAL_RESILIENCE_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeCivilizationalResilience(
  input: RuntimeCivilizationalResilienceObserveInput,
): RuntimeCivilizationalResilienceProfile {
  runCivilizationalEcologyFlows(input);
  for (const entry of getCivilizationalEcologyTimelineRecent(5)) {
    recordCivilizationalResilienceSoakEvent(entry);
  }

  lastRecursiveGraph = buildRecursiveGovernanceGraph(input);
  lastEcologyGraph = buildCrossLayerEcologyGraph(input);
  lastDriftSignals = detectCivilizationDriftSignals(input);

  const profile: RuntimeCivilizationalResilienceProfile = {
    runtimeCivilizationScore: scoreRuntimeCivilization(input),
    recursiveGovernanceEcologyRisk: scoreRecursiveGovernanceEcologyRisk(input),
    runtimeUtilityMonocultureRisk: scoreRuntimeUtilityMonocultureRisk(input),
    observerEcosystemInflationRisk: scoreObserverEcosystemInflationRisk(input),
    runtimeStabilityIdeologyRisk: scoreRuntimeStabilityIdeologyRisk(input),
    runtimeOrchestrationCivilizationRisk: scoreRuntimeOrchestrationCivilizationRisk(input),
    governanceBiodiversityScore: scoreGovernanceBiodiversity(input),
    crossLayerEcologyIntegrity: scoreCrossLayerEcologyIntegrity(input),
    runtimeCivilizationDriftRisk: scoreRuntimeCivilizationDriftRisk(input),
    runtimeEcologicalConfidence: scoreRuntimeEcologicalConfidence(input),
    ecosystemPersistenceScore: scoreEcosystemPersistence(input),
    governanceVarianceScore: scoreGovernanceVariance(input),
    utilityDiversityScore: scoreUtilityDiversity(input),
    civilizationSpreadScore: scoreCivilizationSpread(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeCivilizationalResilienceProfile(): RuntimeCivilizationalResilienceProfile | null {
  return lastProfile;
}

export function getRuntimeCivilizationalResilienceDashboard(): RuntimeCivilizationalResilienceDashboard | null {
  if (!lastProfile || !lastRecursiveGraph || !lastEcologyGraph) return null;
  return {
    titleJa: RUNTIME_CIVILIZATIONAL_RESILIENCE_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_CIVILIZATIONAL_RESILIENCE_UI_JA.safety,
    profile: lastProfile,
    civilizationEvolution: getCivilizationEvolution(),
    ecologicalEvolution: getEcologicalEvolution(),
    recursiveGovernanceGraph: lastRecursiveGraph,
    crossLayerEcologyGraph: lastEcologyGraph,
    civilizationDriftSignals: lastDriftSignals,
    timelineRecent: getCivilizationalEcologyTimelineRecent(6),
  };
}
