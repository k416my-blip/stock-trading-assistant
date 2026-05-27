/**
 * Runtime Purpose Integrity — observe-only value preservation (no policy/recommendation changes).
 */
import type {
  PurposeGraphSnapshot,
  RuntimePurposeIntegrityDashboard,
  RuntimePurposeIntegrityObserveInput,
  RuntimePurposeIntegrityProfile,
} from '../types/runtimePurposeIntegrity';
import {
  RUNTIME_PURPOSE_INTEGRITY_POLL_MS,
  RUNTIME_PURPOSE_INTEGRITY_UI_JA,
} from '../constants/runtimePurposeIntegrity';
import {
  getPurposeEvolutionTimeline,
  resetRuntimePurposeIntegrityCoordinatorForTest,
  scoreRuntimePurposeIntegrity,
} from './runtimePurposeIntegrityCoordinator';
import {
  detectPurposeDriftSignals,
  resetRuntimePurposeDriftDetectorForTest,
  scoreRuntimePurposeDriftRisk,
} from './runtimePurposeDriftDetector';
import { resetValueDilutionTrackerForTest, scoreValueDilutionRisk } from './valueDilutionTracker';
import {
  getStabilityAddictionTimeline,
  resetRuntimeStabilityAddictionDetectorForTest,
  scoreRuntimeStabilityAddiction,
} from './runtimeStabilityAddictionDetector';
import {
  resetRuntimeOrchestrationHollowingDetectorForTest,
  scoreRuntimeHollowingRisk,
} from './runtimeOrchestrationHollowingDetector';
import {
  buildUtilityEquilibriumGraph,
  resetRuntimeUtilityPreservationEngineForTest,
  scoreRuntimeUtilityIntegrity,
  scoreUtilityEquilibriumConfidence,
} from './runtimeUtilityPreservationEngine';
import {
  getInterventionEfficiencyTimeline,
  resetInterventionValueEfficiencyAnalyzerForTest,
  scoreInterventionEfficiency,
  scoreUtilityPerIntervention,
} from './interventionValueEfficiencyAnalyzer';
import {
  resetSurvivabilityUsefulnessDivergenceTrackerForTest,
  scoreRuntimeUsefulnessDivergenceRisk,
  scoreSurvivabilityUtilitySpread,
} from './survivabilityUsefulnessDivergenceTracker';
import {
  resetObserverPurposeImbalanceDetectorForTest,
  scoreObserverOverPersistenceRisk,
  scoreObserverPurposeBalance,
} from './observerPurposeImbalanceDetector';
import {
  getGovernancePressureTimeline,
  resetGovernanceOverreachDetectorForTest,
  scoreRuntimeGovernanceOverreachRisk,
} from './governanceOverreachDetector';
import {
  getValueErosionEvolution,
  resetLongSessionValueErosionEngineForTest,
  scoreLongSessionPurposeIntegrity,
} from './longSessionValueErosionEngine';
import { resetAuditPersistenceMonitorForTest } from './auditPersistenceMonitor';
import { resetInterventionInflationDetectorForTest } from './interventionInflationDetector';
import { resetEquilibriumMaintenanceBiasDetectorForTest } from './equilibriumMaintenanceBiasDetector';
import { resetTelemetrySelfMaintenanceDetectorForTest } from './telemetrySelfMaintenanceDetector';
import { resetPurposeIntentAnchoringMonitorForTest } from './purposeIntentAnchoringMonitor';
import { resetUtilityContinuityAnalyzerForTest } from './utilityContinuityAnalyzer';
import { resetOrchestrationUtilitySpreadTrackerForTest } from './orchestrationUtilitySpreadTracker';
import { resetPurposeIntegrityConfidenceEngineForTest } from './purposeIntegrityConfidenceEngine';
import {
  getPurposeIntegrityTimelineRecent,
  resetPurposeIntegrityTimelineForTest,
} from './purposeIntegrityTimeline';
import { runPurposeIntegrityFlows } from './purposeIntegrityOrchestrator';
import {
  recordPurposeIntegritySoakEvent,
  resetPurposeIntegritySoakIntegrationForTest,
  setPurposeIntegritySoakHook,
} from './purposeIntegritySoakIntegration';

let lastProfile: RuntimePurposeIntegrityProfile | null = null;
let lastUtilityGraph: PurposeGraphSnapshot | null = null;
let lastDriftSignals: string[] = [];
let lastThrottleAt = 0;

export function resetRuntimePurposeIntegrityForTest(): void {
  lastProfile = null;
  lastUtilityGraph = null;
  lastDriftSignals = [];
  lastThrottleAt = 0;
  resetRuntimePurposeIntegrityCoordinatorForTest();
  resetRuntimePurposeDriftDetectorForTest();
  resetValueDilutionTrackerForTest();
  resetRuntimeStabilityAddictionDetectorForTest();
  resetRuntimeOrchestrationHollowingDetectorForTest();
  resetRuntimeUtilityPreservationEngineForTest();
  resetInterventionValueEfficiencyAnalyzerForTest();
  resetSurvivabilityUsefulnessDivergenceTrackerForTest();
  resetObserverPurposeImbalanceDetectorForTest();
  resetGovernanceOverreachDetectorForTest();
  resetLongSessionValueErosionEngineForTest();
  resetAuditPersistenceMonitorForTest();
  resetInterventionInflationDetectorForTest();
  resetEquilibriumMaintenanceBiasDetectorForTest();
  resetTelemetrySelfMaintenanceDetectorForTest();
  resetPurposeIntentAnchoringMonitorForTest();
  resetUtilityContinuityAnalyzerForTest();
  resetOrchestrationUtilitySpreadTrackerForTest();
  resetPurposeIntegrityConfidenceEngineForTest();
  resetPurposeIntegrityTimelineForTest();
  resetPurposeIntegritySoakIntegrationForTest();
}

export function initRuntimePurposeIntegrity(): void {
  lastThrottleAt = 0;
}

export function setRuntimePurposeIntegritySoakHookEnabled(enabled: boolean): void {
  setPurposeIntegritySoakHook(enabled);
}

export function shouldRunRuntimePurposeIntegritySample(
  _input: RuntimePurposeIntegrityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_PURPOSE_INTEGRITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimePurposeIntegrity(
  input: RuntimePurposeIntegrityObserveInput,
): RuntimePurposeIntegrityProfile {
  runPurposeIntegrityFlows(input);
  for (const entry of getPurposeIntegrityTimelineRecent(5)) {
    recordPurposeIntegritySoakEvent(entry);
  }

  lastUtilityGraph = buildUtilityEquilibriumGraph(input);
  lastDriftSignals = detectPurposeDriftSignals(input);

  const profile: RuntimePurposeIntegrityProfile = {
    runtimePurposeIntegrityScore: scoreRuntimePurposeIntegrity(input),
    runtimePurposeDriftRisk: scoreRuntimePurposeDriftRisk(input),
    runtimeStabilityAddictionScore: scoreRuntimeStabilityAddiction(input),
    runtimeHollowingRisk: scoreRuntimeHollowingRisk(input),
    runtimeUtilityIntegrity: scoreRuntimeUtilityIntegrity(input),
    interventionEfficiencyScore: scoreInterventionEfficiency(input),
    runtimeUsefulnessDivergenceRisk: scoreRuntimeUsefulnessDivergenceRisk(input),
    observerPurposeBalance: scoreObserverPurposeBalance(input),
    runtimeGovernanceOverreachRisk: scoreRuntimeGovernanceOverreachRisk(input),
    longSessionPurposeIntegrity: scoreLongSessionPurposeIntegrity(input),
    utilityEquilibriumConfidence: scoreUtilityEquilibriumConfidence(input),
    observerOverPersistenceRisk: scoreObserverOverPersistenceRisk(input),
    survivabilityUtilitySpread: scoreSurvivabilityUtilitySpread(input),
    utilityPerIntervention: scoreUtilityPerIntervention(input),
    valueDilutionRisk: scoreValueDilutionRisk(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimePurposeIntegrityProfile(): RuntimePurposeIntegrityProfile | null {
  return lastProfile;
}

export function getRuntimePurposeIntegrityDashboard(): RuntimePurposeIntegrityDashboard | null {
  if (!lastProfile || !lastUtilityGraph) return null;
  return {
    titleJa: RUNTIME_PURPOSE_INTEGRITY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_PURPOSE_INTEGRITY_UI_JA.safety,
    profile: lastProfile,
    purposeEvolutionTimeline: getPurposeEvolutionTimeline(),
    stabilityAddictionTimeline: getStabilityAddictionTimeline(),
    interventionEfficiencyTimeline: getInterventionEfficiencyTimeline(),
    governancePressureTimeline: getGovernancePressureTimeline(),
    valueErosionEvolution: getValueErosionEvolution(),
    utilityEquilibriumGraph: lastUtilityGraph,
    purposeDriftSignals: lastDriftSignals,
    timelineRecent: getPurposeIntegrityTimelineRecent(6),
  };
}
