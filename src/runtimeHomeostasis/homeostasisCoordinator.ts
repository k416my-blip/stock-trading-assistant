/**
 * Runtime Homeostasis — equilibrium maintenance only (no policy/recommendation changes).
 */
import type {
  HomeostasisGraphSnapshot,
  RuntimeHomeostasisDashboard,
  RuntimeHomeostasisObserveInput,
  RuntimeHomeostasisProfile,
} from '../types/runtimeHomeostasis';
import {
  RUNTIME_HOMEOSTASIS_POLL_MS,
  RUNTIME_HOMEOSTASIS_UI_JA,
} from '../constants/runtimeHomeostasis';
import {
  scoreRuntimeHomeostasis,
  resetRuntimeHomeostasisCoordinatorForTest,
} from './runtimeHomeostasisCoordinator';
import {
  scoreEquilibriumIntegrity,
  scoreEquilibriumPersistence,
  resetStabilityEquilibriumGovernorForTest,
} from './stabilityEquilibriumGovernor';
import {
  scoreAdaptiveStabilityBalance,
  scoreRuntimeInterventionPressure,
  resetAdaptiveInterventionBalancerForTest,
} from './adaptiveInterventionBalancer';
import { resetRuntimeHomeodynamicEngineForTest } from './runtimeHomeodynamicEngine';
import {
  buildStabilityDriftGraph,
  scoreStabilityDriftRisk,
  resetStabilityDriftDetectorForTest,
} from './stabilityDriftDetector';
import {
  scoreRuntimeSelfRegulation,
  resetRuntimeSelfRegulationOrchestratorForTest,
} from './runtimeSelfRegulationOrchestrator';
import {
  getInterventionFatigueTimeline,
  scoreInterventionFatigueLevel,
  resetInterventionFatigueStabilizerForTest,
} from './interventionFatigueStabilizer';
import {
  getAdaptivePacingEvolution,
  noteAdaptivePacingSample,
  scoreAdaptiveEquilibriumConfidence,
  resetAdaptiveEquilibriumPacingForTest,
} from './adaptiveEquilibriumPacing';
import {
  buildCalmStateTransitionGraph,
  scoreRuntimeCalmnessIndex,
  resetRuntimeCalmStateCoordinatorForTest,
} from './runtimeCalmStateCoordinator';
import { resetStabilityReboundSuppressorForTest } from './stabilityReboundSuppressor';
import {
  buildHomeostaticRecoveryGraph,
  scoreHomeostaticRecoveryBalance,
  resetHomeostaticRecoveryBalancerForTest,
} from './homeostaticRecoveryBalancer';
import {
  buildOscillationSuppressionMap,
  scoreStabilizationOscillationRisk,
  resetRuntimeOscillationNeutralizerForTest,
} from './runtimeOscillationNeutralizer';
import { resetAdaptiveContinuityEquilibriumForTest } from './adaptiveContinuityEquilibrium';
import {
  buildStabilizationPressureHeatmap,
  scoreRuntimeHarmonyIndex,
  resetRuntimeStabilizationHarmonizerForTest,
} from './runtimeStabilizationHarmonizer';
import {
  buildCrossLayerEquilibriumGraph,
  scoreCrossLayerStabilityConsistency,
  resetCrossLayerEquilibriumTrackerForTest,
} from './crossLayerEquilibriumTracker';
import {
  getLongSessionEquilibriumTimeline,
  scoreLongSessionHomeostasis,
  resetLongSessionHomeostasisEngineForTest,
} from './longSessionHomeostasisEngine';
import { resetRuntimeRegulationIntegrityMonitorForTest } from './runtimeRegulationIntegrityMonitor';
import { resetAutonomousStabilityPreservationForTest } from './autonomousStabilityPreservation';
import {
  getEquilibriumEvolution,
  resetRuntimeEquilibriumEvolutionCoordinatorForTest,
} from './runtimeEquilibriumEvolutionCoordinator';
import {
  getHomeostasisTimelineRecent,
  resetStabilityHomeodynamicTimelineForTest,
} from './stabilityHomeodynamicTimeline';
import { runHomeostasisFlows } from './homeostasisOrchestrator';
import {
  recordHomeostasisSoakEvent,
  resetHomeostasisSoakIntegrationForTest,
  setHomeostasisSoakHook,
} from './homeostasisSoakIntegration';

let lastProfile: RuntimeHomeostasisProfile | null = null;
let lastDriftGraph: HomeostasisGraphSnapshot | null = null;
let lastOscillationMap: HomeostasisGraphSnapshot | null = null;
let lastCalmGraph: HomeostasisGraphSnapshot | null = null;
let lastCrossLayerGraph: HomeostasisGraphSnapshot | null = null;
let lastRecoveryGraph: HomeostasisGraphSnapshot | null = null;
let lastPressureHeatmap: Record<string, number> = {};
let lastThrottleAt = 0;

export function resetRuntimeHomeostasisForTest(): void {
  lastProfile = null;
  lastDriftGraph = null;
  lastOscillationMap = null;
  lastCalmGraph = null;
  lastCrossLayerGraph = null;
  lastRecoveryGraph = null;
  lastPressureHeatmap = {};
  lastThrottleAt = 0;
  resetRuntimeHomeostasisCoordinatorForTest();
  resetStabilityEquilibriumGovernorForTest();
  resetAdaptiveInterventionBalancerForTest();
  resetRuntimeHomeodynamicEngineForTest();
  resetStabilityDriftDetectorForTest();
  resetRuntimeSelfRegulationOrchestratorForTest();
  resetInterventionFatigueStabilizerForTest();
  resetAdaptiveEquilibriumPacingForTest();
  resetRuntimeCalmStateCoordinatorForTest();
  resetStabilityReboundSuppressorForTest();
  resetHomeostaticRecoveryBalancerForTest();
  resetRuntimeOscillationNeutralizerForTest();
  resetAdaptiveContinuityEquilibriumForTest();
  resetRuntimeStabilizationHarmonizerForTest();
  resetCrossLayerEquilibriumTrackerForTest();
  resetLongSessionHomeostasisEngineForTest();
  resetRuntimeRegulationIntegrityMonitorForTest();
  resetAutonomousStabilityPreservationForTest();
  resetRuntimeEquilibriumEvolutionCoordinatorForTest();
  resetStabilityHomeodynamicTimelineForTest();
  resetHomeostasisSoakIntegrationForTest();
}

export function initRuntimeHomeostasis(): void {
  lastThrottleAt = 0;
}

export function setRuntimeHomeostasisSoakHookEnabled(enabled: boolean): void {
  setHomeostasisSoakHook(enabled);
}

export function shouldRunRuntimeHomeostasisSample(
  _input: RuntimeHomeostasisObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_HOMEOSTASIS_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeHomeostasis(input: RuntimeHomeostasisObserveInput): RuntimeHomeostasisProfile {
  runHomeostasisFlows(input);
  noteAdaptivePacingSample(input);
  for (const entry of getHomeostasisTimelineRecent(5)) {
    recordHomeostasisSoakEvent(entry);
  }

  lastDriftGraph = buildStabilityDriftGraph(input);
  lastOscillationMap = buildOscillationSuppressionMap(input);
  lastCalmGraph = buildCalmStateTransitionGraph(input);
  lastCrossLayerGraph = buildCrossLayerEquilibriumGraph(input);
  lastRecoveryGraph = buildHomeostaticRecoveryGraph(input);
  lastPressureHeatmap = buildStabilizationPressureHeatmap(input);

  const profile: RuntimeHomeostasisProfile = {
    runtimeHomeostasisScore: scoreRuntimeHomeostasis(input),
    stabilityDriftRisk: scoreStabilityDriftRisk(input),
    interventionFatigueLevel: scoreInterventionFatigueLevel(input),
    equilibriumIntegrity: scoreEquilibriumIntegrity(input),
    runtimeCalmnessIndex: scoreRuntimeCalmnessIndex(input),
    adaptiveStabilityBalance: scoreAdaptiveStabilityBalance(input),
    stabilizationOscillationRisk: scoreStabilizationOscillationRisk(input),
    homeostaticRecoveryBalance: scoreHomeostaticRecoveryBalance(input),
    runtimeSelfRegulationScore: scoreRuntimeSelfRegulation(input),
    equilibriumPersistence: scoreEquilibriumPersistence(input),
    runtimeHarmonyIndex: scoreRuntimeHarmonyIndex(input),
    crossLayerStabilityConsistency: scoreCrossLayerStabilityConsistency(input),
    longSessionHomeostasis: scoreLongSessionHomeostasis(input),
    runtimeInterventionPressure: scoreRuntimeInterventionPressure(input),
    adaptiveEquilibriumConfidence: scoreAdaptiveEquilibriumConfidence(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeHomeostasisProfile(): RuntimeHomeostasisProfile | null {
  return lastProfile;
}

export function getRuntimeHomeostasisDashboard(): RuntimeHomeostasisDashboard | null {
  if (!lastProfile || !lastDriftGraph || !lastOscillationMap || !lastCalmGraph || !lastCrossLayerGraph) {
    return null;
  }
  return {
    titleJa: RUNTIME_HOMEOSTASIS_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_HOMEOSTASIS_UI_JA.safety,
    profile: lastProfile,
    equilibriumEvolution: getEquilibriumEvolution(),
    interventionFatigueTimeline: getInterventionFatigueTimeline(),
    stabilityDriftGraph: lastDriftGraph,
    oscillationSuppressionMap: lastOscillationMap,
    calmStateTransitionGraph: lastCalmGraph,
    crossLayerEquilibriumGraph: lastCrossLayerGraph,
    stabilizationPressureHeatmap: lastPressureHeatmap,
    adaptivePacingEvolution: getAdaptivePacingEvolution(),
    homeostaticRecoveryGraph: lastRecoveryGraph ?? lastCrossLayerGraph,
    longSessionEquilibriumTimeline: getLongSessionEquilibriumTimeline(),
    timelineRecent: getHomeostasisTimelineRecent(6),
  };
}

export const observeRuntimeHomeodynamics = observeRuntimeHomeostasis;
export const initRuntimeHomeodynamics = initRuntimeHomeostasis;
